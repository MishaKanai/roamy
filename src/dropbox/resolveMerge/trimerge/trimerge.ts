import { combineMergers, trimergeArrayCreator, trimergeJsonDeepEqual, trimergeObject } from 'trimerge';
const trimerge = combineMergers(
    trimergeJsonDeepEqual,
    trimergeObject,
    trimergeArrayCreator((item: any) => String(item.id)),
);

export default trimerge;