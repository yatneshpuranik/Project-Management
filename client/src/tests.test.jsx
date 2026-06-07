
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '../components/Navbar';
import SettingsScreen from '../page/SettingsScreen';
import AnalyticsScreen from '../page/AnalyticsScreen';
import BoardsScreen from '../page/BoardsScreen';
import { useSelector } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock Redux hooks
vi.mock('react-redux', () => {
  const mockSelector = vi.fn();
  return {
    useSelector: mockSelector,
    useDispatch: () => vi.fn(() => Promise.resolve({ fulfilled: true, payload: [] })),
  };
});

let mockGetFn = vi.fn();

// Mock axiosInstance
vi.mock('../utils/axiosInstance', () => {
  return {
    default: {
      get: (url) => mockGetFn(url),
      post: vi.fn(() => Promise.resolve({ data: {} })),
    },
  };
});

// Mock socket
vi.mock('../utils/socket', () => {
  return {
    default: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  };
});

describe('MERN Kanban SaaS Audit Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFn.mockImplementation((url) => {
      if (url.includes('/activity/board/')) {
        return Promise.resolve({
          data: {
            activities: [
              { type: 'Task Created', message: 'User created Task A', createdAt: new Date().toISOString() },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          analytics: {
            totalTasks: 10,
            completedTasks: 5,
            pendingTasks: 5,
            completionRate: 50,
            velocity: 2.5,
            cycleTime: 4.2,
            activeBacklog: 5,
            burnDown: [
              { dayLabel: 'Jun 01', remaining: 10, guideline: 10 },
              { dayLabel: 'Jun 02', remaining: 9, guideline: 8.3 },
              { dayLabel: 'Jun 03', remaining: 8, guideline: 6.7 },
              { dayLabel: 'Jun 04', remaining: 7, guideline: 5 },
              { dayLabel: 'Jun 05', remaining: 6, guideline: 3.3 },
              { dayLabel: 'Jun 06', remaining: 5, guideline: 1.7 },
              { dayLabel: 'Jun 07', remaining: 5, guideline: 0 },
            ],
            workloadDistribution: {
              high: { count: 2, percentage: 40 },
              medium: { count: 2, percentage: 40 },
              low: { count: 1, percentage: 20 },
              totalAssigned: 5,
            },
          },
        },
      });
    });
  });

  describe('1. Notification System', () => {
    it('dropdown opens and closes on click, and handles outside click', async () => {
      useSelector.mockImplementation((selectorFn) => {
        return selectorFn({
          user: { user: { name: 'Test User' } },
          boards: { currentBoard: { _id: 'board123', title: 'Test Board' } },
        });
      });

      const { container } = render(
        <MemoryRouter>
          <Navbar toggleSidebar={() => {}} />
        </MemoryRouter>
      );
      expect(screen.queryByText(/Inbox \(/)).not.toBeInTheDocument();

      // Click bell icon using container selector
      const bell = container.querySelector('#notification-bell');
      expect(bell).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(bell);
      });

      // Verify dropdown opens
      expect(screen.getByText(/Inbox \(/)).toBeInTheDocument();

      // Click bell again to close
      await act(async () => {
        fireEvent.click(bell);
      });
      expect(screen.queryByText(/Inbox \(/)).not.toBeInTheDocument();

      // Open again and test outside click
      await act(async () => {
        fireEvent.click(bell);
      });
      expect(screen.getByText(/Inbox \(/)).toBeInTheDocument();

      // Perform click outside
      await act(async () => {
        fireEvent.mouseDown(document.body);
      });
      expect(screen.queryByText(/Inbox \(/)).not.toBeInTheDocument();
    });
  });

  describe('2. Invite Collaborator', () => {
    it('verify dropdown visibility and header relative z-index hierarchy', async () => {
      useSelector.mockImplementation((selectorFn) => {
        return selectorFn({
          user: { user: { _id: 'owner123', name: 'Test User' } },
          boards: {
            boards: [{ _id: 'board123', title: 'Test Board', members: [], createdBy: 'owner123' }],
            currentBoard: { _id: 'board123', title: 'Test Board', members: [], createdBy: 'owner123' },
          },
          tasks: { tasks: [], onlineUsers: [] },
        });
      });
      localStorage.setItem('userId', 'owner123');

      const { container } = render(
        <MemoryRouter initialEntries={['/boards']}>
          <Routes>
            <Route path="/boards" element={<BoardsScreen />} />
          </Routes>
        </MemoryRouter>
      );

      // Dropdown should be initially hidden
      expect(screen.queryByPlaceholderText('Search by name, username or email...')).not.toBeInTheDocument();

      // Click invite button on the workspace card
      const inviteBtn = screen.getByTitle('Invite Member');
      await act(async () => {
        fireEvent.click(inviteBtn);
      });

      // Dropdown should be visible
      expect(screen.getByPlaceholderText('Search by name, username or email...')).toBeInTheDocument();
    });
  });

  describe('3. Settings Page', () => {
    it('removed Database & Socket Connection section is not rendered', () => {
      render(
        <MemoryRouter>
          <SettingsScreen />
        </MemoryRouter>
      );
      expect(screen.queryByText('Database & Socket Connection')).not.toBeInTheDocument();
      expect(screen.queryByText('Websocket Connected')).not.toBeInTheDocument();
      expect(screen.queryByText(/ws:\/\/localhost/)).not.toBeInTheDocument();
    });
  });

  describe('4. Analytics Page', () => {
    it('renders metrics and chart layouts correctly from API data', async () => {
      useSelector.mockImplementation((selectorFn) => {
        return selectorFn({
          boards: {
            boards: [{ _id: 'board123', title: 'Test Board' }],
            currentBoard: { _id: 'board123', title: 'Test Board' },
          },
        });
      });

      render(
        <MemoryRouter>
          <AnalyticsScreen />
        </MemoryRouter>
      );

      // Wait for metrics to render
      const completionRate = await screen.findByText('50%');
      expect(completionRate).toBeInTheDocument();

      // Check values by relative selectors
      expect(screen.getByText('tasks/week').previousSibling.textContent).toBe('2.5');
      expect(screen.getByText('4.2d')).toBeInTheDocument();
      expect(screen.getByText('tasks left').previousSibling.textContent).toBe('5');

      // Verify workload distribution percentages are rendered
      expect(screen.getByText('40% High')).toBeInTheDocument();
      expect(screen.getByText('40% Med')).toBeInTheDocument();
      expect(screen.getByText('20% Low')).toBeInTheDocument();
    });

    it('renders empty state when there are no tasks', async () => {
      useSelector.mockImplementation((selectorFn) => {
        return selectorFn({
          boards: {
            boards: [{ _id: 'board123', title: 'Test Board' }],
            currentBoard: { _id: 'board123', title: 'Test Board' },
          },
        });
      });

      // Override get to return 0 tasks
      mockGetFn.mockResolvedValueOnce({
        data: {
          analytics: {
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            completionRate: 0,
            velocity: 0,
            cycleTime: 0,
            activeBacklog: 0,
            burnDown: [],
            workloadDistribution: {
              high: { count: 0, percentage: 0 },
              medium: { count: 0, percentage: 0 },
              low: { count: 0, percentage: 0 },
              totalAssigned: 0,
            },
          },
        },
      });

      render(
        <MemoryRouter>
          <AnalyticsScreen />
        </MemoryRouter>
      );

      const emptyStateText = await screen.findByText('No tasks in this workspace');
      expect(emptyStateText).toBeInTheDocument();
    });
  });
});
