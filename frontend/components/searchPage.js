import React, { useState } from 'react';
import ArticleList from './ArticleList';
import { Notification } from './notification';
import styled from 'styled-components';

function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login to search articles');
      }

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchTerm)}&category=${category}&sentiment=${sentiment}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch search results');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      setError(error.message);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SearchContainer>
      <SearchHeader>Search Articles</SearchHeader>
      
      {error && <Notification type="error" message={error} />}

      <SearchForm onSubmit={handleSearch}>
        <InputGroup>
          <SearchInput
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keywords"
            disabled={isLoading}
          />
          
          <SelectInput
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
          >
            <option value="">All Categories</option>
            <option value="business">Business</option>
            <option value="technology">Technology</option>
            <option value="sports">Sports</option>
            <option value="politics">Politics</option>
            <option value="entertainment">Entertainment</option>
          </SelectInput>

          <SelectInput
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value)}
            disabled={isLoading}
          >
            <option value="">All Sentiments</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEGATIVE">Negative</option>
            <option value="NEUTRAL">Neutral</option>
          </SelectInput>

          <SearchButton type="submit" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </SearchButton>
        </InputGroup>
      </SearchForm>
      
      <ResultsSection>
        <ResultsHeader>
          Search Results
          {searchResults.length > 0 && ` (${searchResults.length} articles found)`}
        </ResultsHeader>
        
        {isLoading ? (
          <LoadingMessage>Searching for articles...</LoadingMessage>
        ) : searchResults.length > 0 ? (
          <ArticleList articles={searchResults} />
        ) : (
          <NoResults>
            {error ? 'Please try again' : 'No articles found. Try different search terms.'}
          </NoResults>
        )}
      </ResultsSection>
    </SearchContainer>
  );
}

// Styled Components
const SearchContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const SearchHeader = styled.h2`
  color: #333;
  margin-bottom: 2rem;
`;

const SearchForm = styled.form`
  margin-bottom: 2rem;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 2;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: #0066cc;
  }
`;

const SelectInput = styled.select`
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;

  &:focus {
    outline: none;
    border-color: #0066cc;
  }
`;

const SearchButton = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0052a3;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const ResultsSection = styled.div`
  margin-top: 2rem;
`;

const ResultsHeader = styled.h3`
  color: #333;
  margin-bottom: 1rem;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
`;

const NoResults = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
  background-color: #f5f5f5;
  border-radius: 4px;
`;

export default SearchPage;
