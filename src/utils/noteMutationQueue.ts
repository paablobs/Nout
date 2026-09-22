import type { Note } from "../repositories/types";

type NoteWriter = (note: Note) => Promise<void>;
type AtomicWriter = () => Promise<void>;
type TimerHandle = ReturnType<typeof setTimeout>;

export interface AtomicMutationOptions {
  rollbackOnFailure?: boolean;
}

export interface NoteMutationQueueOptions {
  debounceMs: number;
  retainLatestUntilObserved?: boolean;
  onError: (error: unknown) => void;
}

const sameNote = (left: Note, right: Note): boolean => {
  const leftKeys = Object.keys(left) as (keyof Note)[];
  const rightKeys = Object.keys(right) as (keyof Note)[];
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
};

/** Serializes writes for each note while allowing text edits to be debounced. */
export class NoteMutationQueue {
  private readonly pending = new Map<string, Note>();
  private readonly timers = new Map<string, TimerHandle>();
  private readonly latest = new Map<string, Note>();
  private readonly writes = new Map<string, Promise<boolean>>();
  private readonly operations = new Set<Promise<boolean>>();
  private readonly debounceMs: number;
  private readonly retainLatestUntilObserved: boolean;
  private readonly onError: (error: unknown) => void;
  private readonly writer: NoteWriter;

  public constructor(writer: NoteWriter, options: NoteMutationQueueOptions) {
    this.writer = writer;
    this.debounceMs = options.debounceMs;
    this.retainLatestUntilObserved = options.retainLatestUntilObserved ?? false;
    this.onError = options.onError;
  }

  public getLatest(id: string): Note | undefined {
    return this.latest.get(id);
  }

  public getLatestNotes(): Record<string, Note> {
    return Object.fromEntries(this.latest);
  }

  public schedule(note: Note): void {
    this.latest.set(note.id, note);
    this.clearTimer(note.id);
    this.pending.set(note.id, note);
    const timer = setTimeout(() => {
      this.timers.delete(note.id);
      const pending = this.pending.get(note.id);
      if (!pending) return;
      this.pending.delete(note.id);
      this.startWrite(pending);
    }, this.debounceMs);
    this.timers.set(note.id, timer);
  }

  public enqueue(note: Note): void {
    this.latest.set(note.id, note);
    this.clearTimer(note.id);
    this.pending.delete(note.id);
    this.startWrite(note);
  }

  /**
   * Runs one operation after earlier writes for these notes, and makes later
   * mutations wait behind it. This is used for folder deletion in the cloud.
   */
  public enqueueAtomic(
    notes: Note[],
    operation: AtomicWriter,
    onError: (error: unknown) => void = this.onError,
    options: AtomicMutationOptions = {},
  ): void {
    const ids = [...new Set(notes.map((note) => note.id))];
    ids.forEach((id) => {
      const pending = this.pending.get(id);
      this.clearTimer(id);
      this.pending.delete(id);
      if (pending) this.startWrite(pending);
    });
    const previousLatest = new Map(
      ids.map((id) => [id, this.latest.get(id)] as const),
    );
    notes.forEach((note) => this.latest.set(note.id, note));

    const previous = ids.map(
      (id) => this.writes.get(id) ?? Promise.resolve(true),
    );
    const next = Promise.all(previous).then(async () => {
      try {
        await operation();
        return true;
      } catch (error) {
        onError(error);
        return false;
      }
    });

    if (ids.length === 0) {
      this.operations.add(next);
      void next.then(() => this.operations.delete(next));
      return;
    }
    ids.forEach((id) => this.writes.set(id, next));
    void next.then((succeeded) => {
      if (!succeeded) {
        ids.forEach((id) => {
          // Preserve a newer mutation that arrived while the operation ran.
          if (this.writes.get(id) !== next || this.pending.has(id)) return;
          if (options.rollbackOnFailure !== false) {
            const previous = previousLatest.get(id);
            if (previous) {
              this.latest.set(id, previous);
            } else {
              this.latest.delete(id);
            }
          } else {
            this.latest.delete(id);
          }
        });
      }
      ids.forEach((id) => this.finishWrite(id, next, succeeded));
    });
  }

  /** Runs an operation after earlier writes and blocks later writes for ids. */
  public enqueueOperation(
    ids: string[],
    operation: AtomicWriter,
    onError: (error: unknown) => void = this.onError,
  ): void {
    const uniqueIds = [...new Set(ids)];
    uniqueIds.forEach((id) => {
      this.clearTimer(id);
      this.pending.delete(id);
      this.latest.delete(id);
    });

    const previous = uniqueIds.map(
      (id) => this.writes.get(id) ?? Promise.resolve(true),
    );
    const next = Promise.all(previous).then(async () => {
      try {
        await operation();
        return true;
      } catch (error) {
        onError(error);
        return false;
      }
    });

    if (uniqueIds.length === 0) {
      this.operations.add(next);
      void next.then(() => this.operations.delete(next));
      return;
    }
    uniqueIds.forEach((id) => this.writes.set(id, next));
    void next.then((succeeded) => {
      uniqueIds.forEach((id) => this.finishWrite(id, next, succeeded));
    });
  }

  public flush(): void {
    this.timers.forEach((_, id) => this.clearTimer(id));
    const pending = [...this.pending.values()];
    this.pending.clear();
    pending.forEach((note) => this.startWrite(note));
  }

  public async flushAndWait(): Promise<void> {
    this.flush();
    await Promise.all([...this.writes.values(), ...this.operations]);
  }

  /** Accepts a cloud snapshot as the acknowledgement for successful writes. */
  public observe(notes: Record<string, Note>): void {
    if (!this.retainLatestUntilObserved) return;
    this.latest.forEach((latest, id) => {
      if (this.pending.has(id) || this.writes.has(id)) return;
      const observed = notes[id];
      if (!observed || sameNote(observed, latest)) {
        this.latest.delete(id);
      }
    });
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.timers.delete(id);
  }

  private startWrite(note: Note): void {
    const previous = this.writes.get(note.id) ?? Promise.resolve(true);
    const next = previous.then(async () => {
      try {
        await this.writer(note);
        return true;
      } catch (error) {
        this.onError(error);
        return false;
      }
    });
    this.writes.set(note.id, next);
    void next.then((succeeded) => this.finishWrite(note.id, next, succeeded));
  }

  private finishWrite(
    id: string,
    write: Promise<boolean>,
    succeeded: boolean,
  ): void {
    if (this.writes.get(id) !== write) return;
    this.writes.delete(id);
    if (succeeded && !this.pending.has(id) && !this.retainLatestUntilObserved) {
      this.latest.delete(id);
    }
  }
}
