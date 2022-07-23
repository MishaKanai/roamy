export type IndexFileStructure = {
    documents: {
        [docFileName: string]: {
            hash: string;
            rev: string;
        }
    }
    drawings: {
        [drawingFileName: string]: {
            hash: string;
            rev: string;
        }
    }
    uploadedFiles: string[];
}