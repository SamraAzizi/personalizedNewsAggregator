import React from 'react';
import styled from 'styled-components';

export const Notification = ({ type, message }) => {
  return (
    <NotificationWrapper type={type}>
      {message}
    </NotificationWrapper>
  );
};

const NotificationWrapper = styled.div`
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  background-color: ${props => 
    props.type === 'error' ? '#ffebee' :
    props.type === 'success' ? '#e8f5e9' :
    '#e3f2fd'
  };
  color: ${props =>
    props.type === 'error' ? '#c62828' :
    props.type === 'success' ? '#2e7d32' :
    '#1565c0'
  };
  border: 1px solid ${props =>
    props.type === 'error' ? '#ef9a9a' :
    props.type === 'success' ? '#a5d6a7' :
    '#90caf9'
  };
`;
