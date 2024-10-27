import { Button, Typography } from "@mui/material";
import React from "react";
import Attachment from "@mui/icons-material/Attachment";
import DropboxIcon from "../../icons/DropboxIcon";

const LandingPage: React.FC<{
  dbxAuth: () => void;
}> = (props) => {
  return (
    <div
      style={{
        height: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          position: "fixed",
          top: 100,
          textAlign: "center",
          animation: "fadeIn 1.5s ease",
        }}
      >
        <Typography variant="h2">Rhyzoam</Typography>
        <Typography variant="body1">A second brain without organs.</Typography>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          height: "100%",
          animation: "slideUp 1s ease",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-evenly",
          }}
        >
          <Button onClick={props.dbxAuth} endIcon={<DropboxIcon />}>
            Log in with Dropbox
          </Button>
        </div>
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default LandingPage;
