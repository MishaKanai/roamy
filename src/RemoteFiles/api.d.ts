export type RemoteFilesApi = {
    uploadFile(data: {
        type: 'file'
        file: File
    } | {
        type: 'b64',
        base64: string,
        mimeType: string,
        forceFileIdentifier?: string,
    }): Promise<{
        id: string
    }>
    downloadFile(id: string): Promise<{
        base64: string;
    }>
    deleteFile(id: string): Promise<void>;
    recoverFile?: (id: string) => Promise<void>;
}