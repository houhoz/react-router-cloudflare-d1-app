import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('electricity', 'routes/electricity.tsx'),
] satisfies RouteConfig;
