'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Trailer, Document, AlertStatus } from './types';
import { generateMockTrailers, calculateDocumentStatus, calculateUrgencyScore } from './mock-data';

interface AppContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  trailers: Trailer[];
  addDocument: (trailerId: string, document: Document) => void;
  updateDocument: (trailerId: string, documentId: string, updates: Partial<Document>) => void;
  deleteDocument: (trailerId: string, documentId: string) => void;
  getTrailersSorted: () => Trailer[];
  getTrailerById: (id: string) => Trailer | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trailers, setTrailers] = useState<Trailer[]>([]);

  // Initialize mock data on component mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('app_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && trailers.length === 0) {
      setTrailers(generateMockTrailers());
    }
  }, [isAuthenticated, trailers.length]);

  const login = useCallback((username: string, password: string): boolean => {
    if (username === 'admin' && password === 'admin') {
      setIsAuthenticated(true);
      localStorage.setItem('app_auth', 'true');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.setItem('app_auth', 'false');
  }, []);

  const addDocument = useCallback((trailerId: string, document: Document) => {
    setTrailers(prevTrailers =>
      prevTrailers.map(trailer => {
        if (trailer.id === trailerId) {
          const newDocuments = [...trailer.documents, document];
          const updatedTrailer = { ...trailer, documents: newDocuments };
          updatedTrailer.urgencyScore = calculateUrgencyScore(newDocuments);
          return updatedTrailer;
        }
        return trailer;
      })
    );
  }, []);

  const updateDocument = useCallback((trailerId: string, documentId: string, updates: Partial<Document>) => {
    setTrailers(prevTrailers =>
      prevTrailers.map(trailer => {
        if (trailer.id === trailerId) {
          const newDocuments = trailer.documents.map(doc => {
            if (doc.id === documentId) {
              return { ...doc, ...updates };
            }
            return doc;
          });
          const updatedTrailer = { ...trailer, documents: newDocuments };
          updatedTrailer.urgencyScore = calculateUrgencyScore(newDocuments);
          return updatedTrailer;
        }
        return trailer;
      })
    );
  }, []);

  const deleteDocument = useCallback((trailerId: string, documentId: string) => {
    setTrailers(prevTrailers =>
      prevTrailers.map(trailer => {
        if (trailer.id === trailerId) {
          const newDocuments = trailer.documents.filter(doc => doc.id !== documentId);
          const updatedTrailer = { ...trailer, documents: newDocuments };
          updatedTrailer.urgencyScore = calculateUrgencyScore(newDocuments);
          return updatedTrailer;
        }
        return trailer;
      })
    );
  }, []);

  const getTrailersSorted = useCallback((): Trailer[] => {
    const sorted = [...trailers].sort((a, b) => b.urgencyScore - a.urgencyScore);
    return sorted;
  }, [trailers]);

  const getTrailerById = useCallback((id: string): Trailer | undefined => {
    return trailers.find(t => t.id === id);
  }, [trailers]);

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        trailers,
        addDocument,
        updateDocument,
        deleteDocument,
        getTrailersSorted,
        getTrailerById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
