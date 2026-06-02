import type { CSSProperties, HTMLAttributes, PropsWithChildren } from "react";

const srOnlyStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

interface SrOnlyProps extends HTMLAttributes<HTMLElement> {
  as?: "span" | "div";
}

const SrOnly = ({
  as: Tag = "span",
  children,
  style,
  ...rest
}: PropsWithChildren<SrOnlyProps>) => (
  <Tag style={{ ...srOnlyStyle, ...style }} {...rest}>
    {children}
  </Tag>
);

export default SrOnly;
