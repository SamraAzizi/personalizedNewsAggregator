<<<<<<< HEAD
import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import UserPreferences from './components/UserPreferences';
import NewsFeed from './components/NewsFeed';
import UserProfile from './components/UserProfile';
import SearchPage from './components/SearchPage';
import Navigation from './components/Navigation';

function App() {
  const isAuthenticated = () => !!localStorage.getItem('token');

  return (
    <Router>
      <Navigation />
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <PrivateRoute path="/preferences" component={UserPreferences} />
        <PrivateRoute path="/news" component={NewsFeed} />
        <PrivateRoute path="/profile" component={UserProfile} />
        <PrivateRoute path="/search" component={SearchPage} />
        <Redirect from="/" to="/news" />
      </Switch>
    </Router>
  );
}

function PrivateRoute({ component: Component, ...rest }) {
  return (
    <Route
      {...rest}
      render={props =>
        isAuthenticated() ? (
          <Component {...props} />
        ) : (
          <Redirect to={{ pathname: "/login", state: { from: props.location } }} />
        )
      }
    />
  );
}

=======
import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import UserPreferences from './components/UserPreferences';
import NewsFeed from './components/NewsFeed';
import UserProfile from './components/UserProfile';
import SearchPage from './components/SearchPage';
import Navigation from './components/Navigation';

function App() {
  const isAuthenticated = () => !!localStorage.getItem('token');

  return (
    <Router>
      <Navigation />
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <PrivateRoute path="/preferences" component={UserPreferences} />
        <PrivateRoute path="/news" component={NewsFeed} />
        <PrivateRoute path="/profile" component={UserProfile} />
        <PrivateRoute path="/search" component={SearchPage} />
        <Redirect from="/" to="/news" />
      </Switch>
    </Router>
  );
}

function PrivateRoute({ component: Component, ...rest }) {
  return (
    <Route
      {...rest}
      render={props =>
        isAuthenticated() ? (
          <Component {...props} />
        ) : (
          <Redirect to={{ pathname: "/login", state: { from: props.location } }} />
        )
      }
    />
  );
}

>>>>>>> 06edc16 (news)
export default App;