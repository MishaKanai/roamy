import { Component, useContext, useState } from "react";
import { ShepherdJourneyProvider, useShepherd } from "@shepherdpro/react";
import "shepherd.js/dist/css/shepherd.css";
import Shepherd, { StepOptions } from "shepherd.js";

// Define steps with validation
const newSteps: StepOptions[] = [
  {
    id: "intro",
    text: "Welcome to the tutorial! Click Next to proceed.",
    attachTo: { element: ".button", on: "bottom" },
    buttons: [
      {
        text: "Next",
        action: function () {
          // Add any validation logic if needed
          this.next();
        },
      },
    ],
  },
  {
    id: "validationStep",
    text: "Please click the button to enable Next.",
    attachTo: { element: "#validationTarget", on: "top" },
    buttons: [
      {
        text: "Next",
        action: function () {
          const validationPassed = document
            .getElementById("validationTarget")
            ?.classList.contains("validated");

          if (validationPassed) {
            this.next();
          } else {
            alert("Please click the button to proceed.");
          }
        },
      },
    ],
  },
  {
    id: "finalStep",
    text: "You've completed the tutorial!",
    buttons: [
      {
        text: "Finish",
        action: function () {
          this.complete();
        },
      },
    ],
  },
];

const tourOptions = {
  defaultStepOptions: {
    cancelIcon: {
      enabled: true,
    },
  },
  useModalOverlay: true,
};

function Button() {
  const Shepherd = useShepherd();
  const tour = new Shepherd.Tour({
    ...tourOptions,
    steps: newSteps,
  });

  return (
    <button className="button dark" onClick={() => tour.start()}>
      Start Tour
    </button>
  );
}

function ValidationButton() {
  const [validated, setValidated] = useState(false);

  const handleClick = () => {
    setValidated(true);
    document.getElementById("validationTarget")?.classList.add("validated");
  };

  return (
    <button id="validationTarget" onClick={handleClick}>
      Click me to validate
    </button>
  );
}

export default function App() {
  return (
    <div>
      <ShepherdJourneyProvider apiKey={"foo"}>
        <Button />
        <ValidationButton />
      </ShepherdJourneyProvider>
    </div>
  );
}
