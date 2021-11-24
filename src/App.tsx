import React from "react";
import { History } from "history";
import { ConnectedRouter } from "connected-react-router";
import { Switch, Route, useRouteMatch } from "react-router-dom";
import { PageRoute } from "./SlateGraph/Page";
import { history } from "./store/configureStore";
import { DrawingPageRoute } from "./Excalidraw/Page";
import AccessControlledPage from "./dropbox/Components/AccessControlledPage";
import Box from '@mui/material/Box';
import Datagrid from './Search/components/Datagrid'
import Demo from "./GraphVis/Demo";

const Docs = React.memo(() => {
  const match = useRouteMatch();
  return (
    <div>
      <Switch>
        <Route path={`${match.path}/:docName`}>
          <PageRoute />
        </Route>
        <Route path={match.path}>
          <Box sx={{ m: 0 }}>
            <Datagrid />
          </Box>
        </Route>
      </Switch>
    </div>
  );
});
const Drawings = React.memo(() => {
  const match = useRouteMatch();
  return (
    <div style={{ paddingTop: '1.5em' }}>
      <Switch>
        <Route path={`${match.path}/:drawingName`}>
          <DrawingPageRoute />
        </Route>
        <Route path={match.path}>
          <h3>Please select a Drawing.</h3>
        </Route>
      </Switch>
    </div>
  );
});
export const getApp = (history: History<unknown>) => {
  function App() {
    return (
      <div>
        <ConnectedRouter history={history}>
          <AccessControlledPage>
          <div>
            <Switch>
              <Route path="/docs">
                <Docs />
              </Route>
              <Route path="/drawings">
                <Drawings />
              </Route>
              <Route path="/graph">
                <Demo />
              </Route>
            </Switch>
          </div>
          </AccessControlledPage>
        </ConnectedRouter>
      </div>
    );
  }
  return App;
};
const App = getApp(history);
export default App;
