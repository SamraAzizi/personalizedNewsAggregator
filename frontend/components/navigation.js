<<<<<<< HEAD
import React from 'react';
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      <ul>
        <li><Link to="/news">Home</Link></li>
        <li><Link to="/profile">Profile</Link></li>
        <li><Link to="/preferences">Preferences</Link></li>
        <li><Link to="/search">Search</Link></li>
        <li><Link to="/login" onClick={() => localStorage.removeItem('token')}>Logout</Link></li>
      </ul>
    </nav>
  );
}

=======
import React from 'react';
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      <ul>
        <li><Link to="/news">Home</Link></li>
        <li><Link to="/profile">Profile</Link></li>
        <li><Link to="/preferences">Preferences</Link></li>
        <li><Link to="/search">Search</Link></li>
        <li><Link to="/login" onClick={() => localStorage.removeItem('token')}>Logout</Link></li>
      </ul>
    </nav>
  );
}

>>>>>>> 06edc16 (news)
export default Navigation;