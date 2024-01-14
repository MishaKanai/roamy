import JSZip from "jszip";

interface VideoFile {
  filename: string;
  base64: string;
}

export async function createZipWithVideos(
  videoFiles: VideoFile[]
): Promise<JSZip> {
  const zip = new JSZip();
  const folder = zip.folder("static");

  videoFiles.forEach((videoFile) => {
    const videoBlob = base64ToBlob(videoFile.base64, "video/mp4");
    folder!.file(videoFile.filename, videoBlob);
  });

  return zip;
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64.split(",")[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

// // Example usage
// const videoFiles: VideoFile[] = [
//   { filename: "video1.mp4", base64: "data:video/mp4;base64,AAAA..." },
//   { filename: "video2.mp4", base64: "data:video/mp4;base64,BBBB..." },
//   // Add more video files here
// ];

// createZipWithVideos(videoFiles).then((zip) => {
//   // Use the zip object here
//   // For example, you can generate a Blob for download:
//   zip.generateAsync({ type: "blob" }).then((blob) => {
//     // Handle the blob for download
//   });
// });
