import React from "react";
import { useSelector } from "react-redux";
import { History } from "history";
import { ConnectedRouter } from "connected-react-router";
import { Switch, Route, Link, useRouteMatch } from "react-router-dom";
import { PageRoute } from "./SlateGraph/Page";
import { docNamesSelector } from "./SlateGraph/globalSelectors";
import { history } from "./store/configureStore";

const DocsNav: React.FC<{}> = (props) => {
  const docNames = useSelector(docNamesSelector);
  return (
    <ul>
      {docNames.map((n, i) => {
        return (
          <li key={n}>
            <Link to={`/docs/${n}`}>{n}</Link>
          </li>
        );
      })}
      <li>
        <Link to={`/docs/foo`}>foolink :)</Link>
      </li>
    </ul>
  );
};
const Docs = React.memo(() => {
  const match = useRouteMatch();
  return (
    <div>
      <h2>Topics</h2>
      <DocsNav />
      <Switch>
        <Route path={`${match.path}/:docName`}>
          <PageRoute />
        </Route>
        <Route path={match.path}>
          <h3>Please select a topic.</h3>
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
          <div>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/docs">Docs</Link>
              </li>
            </ul>
          </div>
          <div>
            <Switch>
              <Route path="/about">
                <div>About</div>
              </Route>
              <Route path="/docs">
                <Docs />
              </Route>
              <Route path="/">
                <div>Home</div>
              </Route>
            </Switch>
          </div>
        </ConnectedRouter>
      </div>
    );
  }
  return App;
};
const App = getApp(history);
export default App;
