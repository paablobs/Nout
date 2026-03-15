import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  DialogActions,
  Button,
} from "@mui/material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase";

interface AuthProps {
  isOpen: boolean;
  //   onLogin: (email: string, password: string) => void;
  onClose: () => void;
}

const Auth = ({ isOpen, onClose }: AuthProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleClose = () => {
    onClose();
  };

  const onLogin = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    // After successful login, you can close the dialog
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogTitle>Auth</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter your email and password to log in.
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
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={() => onLogin(email, password)}
          variant="contained"
          color="secondary"
        >
          Login
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Auth;
