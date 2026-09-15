-- The in-app chat could not start a conversation.
--
-- conversations and messages were given select and delete policies and no
-- insert. The widget kept working because it runs with the service role, which
-- bypasses RLS after its own checks — so the gap only showed on the path a
-- signed-in owner uses, and the answer-quality set missed it too because that
-- also runs with the service role.
--
-- An owner may write into their own bots' conversations, and messages into
-- conversations that belong to them. Nothing here is granted to anon: a
-- visitor's messages are still written by the server on their behalf.

create policy "conversations are started on own bots"
  on conversations for insert
  with check (owns_bot(bot_id));

create policy "messages are added to own conversations"
  on messages for insert
  with check (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and owns_bot(conversations.bot_id)
    )
  );

-- Titles are set from the first question, so the row is updated after insert.
create policy "own conversations are editable"
  on conversations for update
  using (owns_bot(bot_id))
  with check (owns_bot(bot_id));
