import { Navigate } from 'react-router-dom';

/**
 * The /app/tests route previously rendered hardcoded placeholder data
 * ("React Basics", "JavaScript Advanced", …) that was not real referee content
 * and linked to non-existent tests. The real, working tests live in the Learn
 * area, so redirect there until a dedicated tests index is built.
 */
export default function TestsList() {
  return <Navigate to="/app/learn" replace />;
}
