/**
 * SINGLEFILE mode is going to be used when we are a self contained
 * html file to serve as a standalone export.
 *
 * This flag will hide editing functionality, and turn the app into a viewer
 * of some initial redux-state templated into the html file.
 */
const SINGLEFILE = import.meta.env.VITE_APP_SINGLEFILE;

const isSingleFile = () => !!SINGLEFILE;
export default isSingleFile;
