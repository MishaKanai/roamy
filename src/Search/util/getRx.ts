import escapeRegExp from "lodash/escapeRegExp";

const getRx = (inputText: string, rxFlags?: string) => {    
    return new RegExp(escapeRegExp(inputText), rxFlags);
}
export default getRx