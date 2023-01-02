// This example is for an Editor with `ReactEditor` and `HistoryEditor`
import { BaseEditor } from 'slate'
import { ReactEditor } from 'slate-react'
import { HistoryEditor } from 'slate-history'

export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor

export type ListItemElement = {
  id?: string;
  type: 'list-item'
  children: CustomText[]
}

export type ParagraphElement = {
  id?: string;
  type: 'paragraph'
  children: CustomText[]
}

export type HeadingOneElement = {
  id?: string;
  type: 'heading-one'
  children: CustomText[]
}

export type HeadingTwoElement = {
  id?: string;
  type: 'heading-two'
  children: CustomText[]
}

export type ReferenceElement = {
  id?: string;
  type: "reference";
  docReference: string;
  children: CustomText[];
};

export type PortalElement = {
  id?: string;
  type: "portal";
  portalReference: string;
  children: CustomText[];
};

export type BulletedListElement = {
  id?: string;
  type: "bulleted-list";
  children: {
    id?: string;
    type: 'list-item'
    children: CustomElement[]
  }[];
};

export type NumberedListElement = {
  id?: string;
  type: "numbered-list";
  children: {
    id?: string;
    type: 'list-item'
    children: CustomElement[]
  }[];
};


export type DrawingElement = {
  id?: string;
  type: "drawing";
  drawingReference: string;
  children: CustomText[];
}

export type ImageElement = {
  type: 'image';
  children: CustomText[];
} & ({
  variant: 'url';
  url: string;
  imageId?: string;
} | {
  variant: 'id-link';
  imageId: string;
})

export type RemoteFileElement = {
  type: 'remotefile';
  children: CustomText[];
  fileIdentifier: string;
}

export type CustomElement =
  | RemoteFileElement
  | ImageElement
  | ListItemElement
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | ReferenceElement
  | PortalElement
  | BulletedListElement
  | NumberedListElement
  | DrawingElement

export type FormattedText = { id?: string; text: string; bold?: true, italic?: true, underline?: true }

export type CustomText = FormattedText

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor
    Element: CustomElement
    Text: CustomText
  }
}