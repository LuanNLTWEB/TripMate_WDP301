import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import Itinerary from '../src/models/Itinerary.js';
import { addComment, deleteComment } from '../src/controllers/itineraryController.js';

const originalFindById = Itinerary.findById;

afterEach(() => {
  Itinerary.findById = originalFindById;
});

const createResponse = () => {
  const output = { statusCode: 200, body: null };
  output.response = {
    status(code) {
      output.statusCode = code;
      return this;
    },
    json(body) {
      output.body = body;
      return this;
    }
  };
  return output;
};

const makeItinerary = ({
  ownerId = 'user-owner',
  collaborators = [],
  comments = []
} = {}) => {
  let saveCount = 0;
  const commentList = comments.map((c) => ({
    ...c,
    _id: c._id || 'comment-1'
  }));

  const commentsProxy = [...commentList];
  commentsProxy.id = (id) => commentsProxy.find((c) => String(c._id) === String(id));
  commentsProxy.pull = (id) => {
    const idx = commentsProxy.findIndex((c) => String(c._id) === String(id));
    if (idx !== -1) commentsProxy.splice(idx, 1);
  };

  const doc = {
    _id: 'itin-1',
    title: 'Test Itinerary',
    owner: ownerId,
    collaborators,
    comments: commentsProxy,
    toObject() {
      return {
        _id: this._id,
        title: this.title,
        owner: this.owner,
        collaborators: this.collaborators,
        comments: [...this.comments]
      };
    },
    async save() {
      saveCount += 1;
    },
    get saveCount() {
      return saveCount;
    }
  };

  const queryMock = {
    ...doc,
    populate() {
      return queryMock;
    },
    then(resolve) {
      return Promise.resolve(doc).then(resolve);
    }
  };

  return { doc, queryMock };
};

test('rejects comment when user is not owner or collaborator', async () => {
  const { doc, queryMock } = makeItinerary({ ownerId: 'user-owner', collaborators: [] });
  Itinerary.findById = () => queryMock;

  const result = createResponse();
  const req = {
    params: { id: 'itin-1' },
    user: { _id: 'stranger-user' },
    body: { content: 'Xin chào' }
  };

  await addComment(req, result.response);
  assert.equal(result.statusCode, 403);
  assert.match(result.body.message, /không có quyền tham gia thảo luận/);
  assert.equal(doc.saveCount, 0);
});

test('allows read-only collaborator to post comment (BR-74)', async () => {
  const { doc, queryMock } = makeItinerary({
    ownerId: 'user-owner',
    collaborators: [{ user: 'user-collab-view', permission: 'view' }]
  });
  Itinerary.findById = () => queryMock;

  const result = createResponse();
  const req = {
    params: { id: 'itin-1' },
    user: { _id: 'user-collab-view' },
    body: { content: 'Tôi thấy lịch trình rất hợp lý!' }
  };

  await addComment(req, result.response);
  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.equal(doc.comments.length, 1);
  assert.equal(doc.comments[0].content, 'Tôi thấy lịch trình rất hợp lý!');
});

test('allows comment author and itinerary owner to delete comment, rejects others', async () => {
  const { doc, queryMock } = makeItinerary({
    ownerId: 'user-owner',
    collaborators: [
      { user: 'author-1', permission: 'view' },
      { user: 'other-collab', permission: 'edit' }
    ],
    comments: [{ _id: 'comment-123', user: 'author-1', content: 'Ý kiến của tôi' }]
  });
  Itinerary.findById = () => queryMock;

  // 1. Other collaborator cannot delete author-1's comment
  const res1 = createResponse();
  await deleteComment(
    { params: { id: 'itin-1', commentId: 'comment-123' }, user: { _id: 'other-collab' } },
    res1.response
  );
  assert.equal(res1.statusCode, 403);
  assert.match(res1.body.message, /không có quyền xóa/);

  // 2. Author can delete their own comment
  const res2 = createResponse();
  await deleteComment(
    { params: { id: 'itin-1', commentId: 'comment-123' }, user: { _id: 'author-1' } },
    res2.response
  );
  assert.equal(res2.statusCode, 200);
  assert.equal(res2.body.success, true);
  assert.equal(doc.comments.length, 0);
});
