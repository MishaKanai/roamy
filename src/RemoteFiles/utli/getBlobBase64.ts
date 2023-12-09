const getBlobBase64 = (blob: Blob): Promise<string> => {
  return new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      const base64 = reader.result as string;
      if (!base64) {
        rej();
      }
      res(base64);
    };
    reader.onerror = (error) => rej(error);
  });
};
export default getBlobBase64;
