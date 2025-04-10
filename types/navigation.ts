import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Define the parameter list for your navigation
export type RootStackParamList = {
  'login': undefined;
  'signup': undefined;
  'user-bio-form': undefined;
  'main-menu': undefined;
  'user-profile': undefined;
  'step-counter': undefined;
  'calorie-tracker': undefined;
  'leaderboard': undefined;
  'personalized-goals': { tab?: string };
  'goal-detail': { goalId: string };
  'fitness-analytics': undefined;
  'coach': undefined;
  'community-leaderboards': undefined;
  'team-detail': { teamId: string };
  'challenge-detail': { challengeId: string };
  'friend-search': undefined;
  'create-team': undefined;
  'teams': undefined;
  'challenges': undefined;
  'activity-feed': undefined;
};

// Define type for navigation prop
export type NavigationProp<RouteName extends keyof RootStackParamList> = 
  StackNavigationProp<RootStackParamList, RouteName>;

// Define type for route prop
export type RouteProps<RouteName extends keyof RootStackParamList> = 
  RouteProp<RootStackParamList, RouteName>;