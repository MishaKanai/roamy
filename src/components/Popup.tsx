import React from "react";
import { Modal, Dialog } from "@material-ui/core";
import { ModalProps } from "@material-ui/core/Modal";
import { DialogProps } from "@material-ui/core/Dialog";

export type PopupProps<T = null> = (
  | {
      component?: "dialog";
      ComponentProps?: Partial<DialogProps>;
    }
  | {
      component: "modal";
      ComponentProps?: Partial<ModalProps>;
    }
) & {
  divClass?: string;
  renderDialogContent: (args: {
    closeDialog: () => void;
    optionalData: T | null;
  }) => JSX.Element | null;
  renderToggler: (args: {
    openDialog: (optionalData?: T | null) => () => void;
  }) => JSX.Element | null;
  paperStyle?: {};
  onClose?: () => void;
};
interface PopupState<T = null> {
  dialogOpen: boolean;
  optionalData: T | null;
}
class Popup<T = null> extends React.Component<PopupProps<T>, PopupState<T>> {
  constructor(props: PopupProps<T>) {
    super(props);
    this.state = {
      dialogOpen: false,
      optionalData: null,
    };
  }
  closeDialog = () => {
    this.setState({ dialogOpen: false, optionalData: null }, () => {
      if (this.props.onClose) {
        this.props.onClose();
      }
    });
  };
  openDialog = (optionalData: T | null = null) => () => {
    this.setState({ dialogOpen: true, optionalData });
  };
  renderDialog = () => {
    const {
      renderDialogContent,
      paperStyle,
      component = "dialog",
      ComponentProps = {},
      divClass,
    } = this.props;
    const { dialogOpen, optionalData } = this.state;
    const content = renderDialogContent({
      closeDialog: this.closeDialog,
      optionalData,
    });
    return component === "dialog" ? (
      <Dialog
        maxWidth={false}
        {...ComponentProps}
        PaperProps={{
          style: paperStyle || {},
        }}
        onClose={this.closeDialog}
        open={dialogOpen}
      >
        <div className={divClass}>{content}</div>
      </Dialog>
    ) : (
      <Modal onClose={this.closeDialog} open={dialogOpen} {...ComponentProps}>
        <div className={divClass}>{content}</div>
      </Modal>
    );
  };
  render() {
    const { renderToggler } = this.props;
    return (
      <React.Fragment>
        {this.renderDialog()}
        {renderToggler({ openDialog: this.openDialog })}
      </React.Fragment>
    );
  }
}

export default Popup;
