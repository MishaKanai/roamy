import React from "react";
import { useSelector } from "react-redux";
import { History } from "history";
import { ConnectedRouter } from "connected-react-router";
import { Switch, Route, Link, useRouteMatch } from "react-router-dom";
import { PageRoute } from "./SlateGraph/Page";
import { history } from "./store/configureStore";
import { DrawingPageRoute } from "./Excalidraw/Page";
import { drawingNamesSelector } from "./Excalidraw/globalSelectors";
import AccessControlledPage from "./dropbox/Components/AccessControlledPage";
import Box from '@mui/material/Box';
import Datagrid from './Search/components/Datagrid'
import Demo from "./GraphVis/Demo";

const DrawingsNav: React.FC<{}> = (props) => {
  const drawingNames = useSelector(drawingNamesSelector);
  return (
    <ul>
      {drawingNames.map((n, i) => {
        return (
          <li key={n}>
            <Link to={`/drawings/${n}`}>{n}</Link>
          </li>
        );
      })}
      <li>
        <Link to={`/drawings/foo`}>foolink :)</Link>
      </li>
    </ul>
  );
};
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
    <div>
      <h2>Drawings</h2>
      <DrawingsNav />
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
