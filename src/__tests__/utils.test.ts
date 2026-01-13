/**
 * Unit tests for shared utility functions
 */

import { describe, it, expect } from 'vitest';
import { getProjectName } from '../lib/utils';

describe('getProjectName', () => {
  const mockProjects = [
    { id: 'proj-1', name: 'Project Alpha' },
    { id: 'proj-2', name: 'Project Beta' },
    { id: 'proj-3', name: 'General' },
  ];

  it('should return project name when project exists', () => {
    expect(getProjectName('proj-1', mockProjects)).toBe('Project Alpha');
    expect(getProjectName('proj-2', mockProjects)).toBe('Project Beta');
  });

  it('should return global fallback for null/undefined projectId', () => {
    expect(getProjectName(null, mockProjects)).toBe('Global');
    expect(getProjectName(undefined, mockProjects)).toBe('Global');
  });

  it('should return notFound fallback when project does not exist', () => {
    expect(getProjectName('non-existent', mockProjects)).toBe('Project');
  });

  it('should use custom fallbacks when provided', () => {
    const customFallbacks = { global: 'العالمية', notFound: 'غير موجود' };
    
    expect(getProjectName(null, mockProjects, customFallbacks)).toBe('العالمية');
    expect(getProjectName('non-existent', mockProjects, customFallbacks)).toBe('غير موجود');
  });

  it('should handle empty projects array', () => {
    expect(getProjectName('proj-1', [])).toBe('Project');
    expect(getProjectName(null, [])).toBe('Global');
  });

  it('should handle empty string projectId as falsy', () => {
    // Empty string is truthy in our function but won't find a match
    // This tests edge case handling
    expect(getProjectName('', mockProjects)).toBe('Global');
  });
});
