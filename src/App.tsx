import React from "react";
import "setimmediate";
import { History } from "history";
import { ConnectedRouter } from "connected-react-router";
import { Switch, Route, useRouteMatch } from "react-router-dom";
import { PageRoute } from "./SlateGraph/Page";
import { history } from "./store/configureStore";
import { DrawingPageRoute } from "./Excalidraw/Page";
import AccessControlledPage from "./dropbox/Components/AccessControlledPage";
import Box from "@mui/material/Box";
import Demo from "./GraphVis/Demo";
import Home from "./components/Home";
import CollectionSettings from "./dropbox/Components/CollectionSettings";
import MasonrySearch from "./Search/components/Masonry";
import CompressFileDialog from "./RemoteFiles/util/CompressMp4Dialog/Dialog";
import CategoryPage from "./Category/CategoryRoute";
import AppGraph3D from "./GraphVis/Graph3D";

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
            <MasonrySearch />
          </Box>
        </Route>
      </Switch>
    </div>
  );
});
const Drawings = React.memo(() => {
  const match = useRouteMatch();
  return (
    <div style={{ paddingTop: "1.5em" }}>
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
export const getApp = (history: History) => {
  function App() {
    return (
      <div style={{ height: "100%" }}>
        <ConnectedRouter history={history}>
          <AccessControlledPage>
            <div style={{ height: "100%" }}>
              <Switch>
                <Route path="/docs">
                  <Docs />
                </Route>
                <Route path="/drawings">
                  <Drawings />
                </Route>
                <Route path="/graph2d">
                  <Demo />
                </Route>
                <Route path="/graph">
                  <AppGraph3D />
                </Route>
                <Route path="/categories">
                  <CategoryPage />
                </Route>
                <Route path="/settings">
                  <CollectionSettings />
                </Route>
                <Route path="/">
                  <Home />
                </Route>
              </Switch>
              <CompressFileDialog />
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
