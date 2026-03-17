import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  DialogActions,
  Button,
  Link,
} from "@mui/material";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../../config/firebase";

interface AuthProps {
  isOpen: boolean;
  //   onLogin: (email: string, password: string) => void;
  onClose: () => void;
}

const Auth = ({ isOpen, onClose }: AuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  const handleClose = () => {
    onClose();
  };

  const cleanState = () => {
    setEmail("");
    setPassword("");
  };

  const onLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password).then(
        (userCredential) => {
          const user = userCredential.user;
          console.log("User logged in:", user);
        },
      );
      onClose();
      cleanState();
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  const onRegister = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password).then(
        (userCredential) => {
          const user = userCredential.user;
          console.log("User registered:", user);
        },
      );
      onClose();
      cleanState();
    } catch (error) {
      console.error("Error during registration:", error);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogTitle>{isRegister ? "Register" : "Login"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {isRegister
            ? "Please enter your email and password to register."
            : "Please enter your email and password to log in."}
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Email"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Password"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </DialogContent>
      {isRegister ? (
        <Link
          component="button"
          underline="hover"
          onClick={() => setIsRegister(!isRegister)}
        >
          Already have an account? Login
        </Link>
      ) : (
        <Link
          component="button"
          underline="hover"
          onClick={() => setIsRegister(!isRegister)}
        >
          Don't have an account? Register
        </Link>
      )}
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {isRegister ? (
          <Button
            onClick={() => onRegister(email, password)}
            variant="contained"
            color="secondary"
          >
            Register
          </Button>
        ) : (
          <Button
            onClick={() => onLogin(email, password)}
            variant="contained"
            color="secondary"
          >
            Login
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default Auth;
