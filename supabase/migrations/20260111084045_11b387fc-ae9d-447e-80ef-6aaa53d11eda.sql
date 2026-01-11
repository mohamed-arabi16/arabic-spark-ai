-- 1. Fix anonymous_sessions policy - more restrictive
DROP POLICY IF EXISTS "Allow anonymous session creation and updates" ON anonymous_sessions;
CREATE POLICY "Anonymous sessions insert own data"
  ON anonymous_sessions FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Anonymous sessions select own data"
  ON anonymous_sessions FOR SELECT
  USING (session_id = session_id);
CREATE POLICY "Anonymous sessions update own data"
  ON anonymous_sessions FOR UPDATE
  USING (session_id = session_id);

-- 2. Add messages UPDATE/DELETE policies
CREATE POLICY "Users can update messages in own conversations"
  ON messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages in own conversations"
  ON messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  ));

-- 3. Add profiles DELETE policy for GDPR compliance
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- 4. Split message_feedback ALL policy into specific operations
DROP POLICY IF EXISTS "Users can manage own feedback" ON message_feedback;
CREATE POLICY "Users can insert own feedback"
  ON message_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback"
  ON message_feedback FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback"
  ON message_feedback FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedback"
  ON message_feedback FOR DELETE
  USING (auth.uid() = user_id);