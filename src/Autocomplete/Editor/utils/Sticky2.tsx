import React, { useEffect, useRef } from "react";
import debounce from "lodash/debounce";
import { useTheme } from "@mui/material";

// from https://www.codemzy.com/blog/sticky-fixed-header-ios-keyboard-fix
const Sticky2: React.FC<{
  isFocused?: boolean;
  Toolbar: React.ReactNode;
  children: JSX.Element;
}> = (props) => {
  const theme = useTheme();

  const toolbarWrapperRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let fixPosition = 0;
    let toolbarWrap = toolbarWrapperRef.current;
    let toolbar = toolbarRef.current;
    let editor = editorRef.current;

    // function to set the margin to show the toolbar if hidden
    const setMargin = function () {
      // if toolbar wrap is hidden
      const newPosition = toolbarWrap!.getBoundingClientRect().top;
      if (newPosition < -1) {
        // add a margin to show the toolbar
        toolbar!.classList.add("down"); // add class so toolbar can be animated
        fixPosition = Math.abs(newPosition); // this is new position we need to fix the toolbar in the display
        // if at the bottom of the page take a couple of pixels off due to gap
        if (
          window.innerHeight + window.pageYOffset >=
          document.body.offsetHeight
        ) {
          fixPosition -= 2;
        }
        // set the margin to the new fixed position
        toolbar!.style.marginTop = fixPosition + "px";
      }
    };

    // use lodash debounce to stop flicker
    const debounceMargin = debounce(setMargin, 150);

    // function to run on scroll and blur
    const showToolbar = function () {
      // remove animation and put toolbar back in default position
      if (fixPosition > 0) {
        toolbar!.classList.remove("down");
        fixPosition = 0;
        toolbar!.style.marginTop = 0 + "px";
      }
      // will check if toolbar needs to be fixed
      debounceMargin();
    };

    // add an event listener to scroll to check if
    // toolbar position has moved off the page
    window.addEventListener("scroll", showToolbar);
    // add an event listener to blur as iOS keyboard may have closed
    // and toolbar postition needs to be checked again
    editor!.addEventListener("blur", showToolbar);
  }, []);
  return (
    <div>
      <div
        ref={toolbarWrapperRef}
        className="sticky-toolbar-wrap"
        style={{
          zIndex: 2004,
          backgroundColor: theme.palette.background.default,
        }}
      >
        <div
          ref={toolbarRef}
          className="sticky-toolbar"
          style={{ height: !props.isFocused ? 0 : undefined }}
        >
          {props.isFocused && props.Toolbar}
        </div>
      </div>
      {/* re-use the below as a spacer, so it has the exact height */}
      <div style={{ visibility: "hidden" }}>{props.Toolbar}</div>
      <div ref={editorRef}>{props.children}</div>
    </div>
  );
};

export default Sticky2;
