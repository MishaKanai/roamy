import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/createRootReducer';
import MUIDataTable from "mui-datatables";
import moment from 'moment';
import { push } from 'connected-react-router';


const DATETIME_FORMAT = 'MMMM Do YYYY, h:mm:ss a';

const DataTable = () => {
    const data = useSelector((state: RootState) => {
        return Object.entries(state.documents).map(([name, {
            createdDate, lastUpdatedDate
        }]) => [name, createdDate, lastUpdatedDate] as const)
    })
    const dispatch = useDispatch()
    return <MUIDataTable
        title={"Documents"}
        data={data}
        columns={[
            { name: "Name", options: { filterOptions: { fullWidth: true } } },
            { name: "Created", options: { customBodyRender: (value) => moment(value).format(DATETIME_FORMAT) } },
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