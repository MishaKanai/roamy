import React from 'react';
import MUIDataTable from "mui-datatables";
import moment from 'moment';
import { push } from 'connected-react-router';
import { useAppDispatch, useAppSelector } from '../../store/hooks';


const DATETIME_FORMAT = 'MMMM Do YYYY, h:mm:ss a';

const DataTable = () => {
    const data = useAppSelector(state => {
        return Object.entries(state.documents).map(([name, {
            createdDate, lastUpdatedDate
        }]) => [name, createdDate, lastUpdatedDate] as const)
    })
    const dispatch = useAppDispatch()
    return <MUIDataTable
        title={"Concepts"}
        data={data}
        columns={[
            { name: "Name", options: { filterOptions: { fullWidth: true } } },
            { name: "Created", options: { sortCompare: (order) => ({ data: data1 }, { data: data2}) => {
                const date1 = moment(data1);
                const res = date1.isBefore(data2) ? 1 : date1.isAfter(data2) ? -1 : 0;
                return res * (order === 'asc' ? 1 : -1)
            }, customBodyRender: (value) => moment(value).format(DATETIME_FORMAT) } },
            { name: "Last Updated", options: { customBodyRender: (value) => moment(value).format(DATETIME_FORMAT) } }
        ]}
        options={{
            search: true,
            filter: false,
            print: false,
            download: false,
            viewColumns: false,
            selectableRows: 'none',
            responsive: 'simple',
            onRowClick: rowData => dispatch(push('/docs/' + rowData[0]))
        }}
    />
}
export default DataTable;