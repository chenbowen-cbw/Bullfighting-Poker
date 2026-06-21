import { describe, it, expect, beforeEach } from 'vitest';
import { FriendsService } from '../src/service';
import { InMemoryFriendsRepository, type FriendUserRecord } from '../src/repository';
import { FriendsError } from '../src/errors';

function user(id: string, username: string): FriendUserRecord {
  return {
    id,
    username,
    nickname: `昵称${id}`,
    avatarUrl: null,
    chips: 1000,
    status: 'active',
  };
}

describe('FriendsService', () => {
  let repo: InMemoryFriendsRepository;
  let svc: FriendsService;

  beforeEach(() => {
    repo = new InMemoryFriendsRepository();
    repo.seedUser(user('1', 'alice'));
    repo.seedUser(user('2', 'bob'));
    repo.seedUser(user('3', 'carol'));
    svc = new FriendsService(repo);
  });

  // ── 发起请求 ──

  it('发起请求:成功创建 pending', async () => {
    const f = await svc.sendRequest('1', 'bob');
    expect(f.status).toBe('pending');
    expect(f.requesterId).toBe('1');
    expect(f.addresseeId).toBe('2');
  });

  it('发起请求:用户名不存在 → USER_NOT_FOUND', async () => {
    await expect(svc.sendRequest('1', 'nobody')).rejects.toBeInstanceOf(FriendsError);
    await expect(svc.sendRequest('1', 'nobody')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
  });

  it('发起请求:加自己 → CANNOT_FRIEND_SELF', async () => {
    await expect(svc.sendRequest('1', 'alice')).rejects.toMatchObject({
      code: 'CANNOT_FRIEND_SELF',
    });
  });

  it('发起请求:同向重复 → REQUEST_EXISTS', async () => {
    await svc.sendRequest('1', 'bob');
    await expect(svc.sendRequest('1', 'bob')).rejects.toMatchObject({ code: 'REQUEST_EXISTS' });
  });

  it('发起请求:已是好友 → ALREADY_FRIENDS', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.acceptRequest('2', f.id);
    await expect(svc.sendRequest('1', 'bob')).rejects.toMatchObject({ code: 'ALREADY_FRIENDS' });
    // 反向再加也应判定已是好友
    await expect(svc.sendRequest('2', 'alice')).rejects.toMatchObject({ code: 'ALREADY_FRIENDS' });
  });

  it('发起请求:反向 pending 存在则自动接受', async () => {
    await svc.sendRequest('2', 'alice'); // bob -> alice
    const f = await svc.sendRequest('1', 'bob'); // alice -> bob 触发自动接受
    expect(f.status).toBe('accepted');
    // 双方好友列表都应出现对方
    expect((await svc.listFriends('1')).map((u) => u.id)).toContain('2');
    expect((await svc.listFriends('2')).map((u) => u.id)).toContain('1');
  });

  it('发起请求:唯一约束冲突(并发)被视为 REQUEST_EXISTS', async () => {
    // 直接在仓储里建一条同向记录,再让 service 走 createRequest 触发仿唯一冲突
    await repo.createRequest('1', '2');
    // findFriendshipBetween 会先命中,这里改造为模拟"between 查不到但插入冲突"的竞态:
    // 用一个查不到 between、但 createRequest 抛 23505 的子类验证兜底分支
    const racingRepo = new InMemoryFriendsRepository();
    racingRepo.seedUser(user('1', 'alice'));
    racingRepo.seedUser(user('2', 'bob'));
    const original = racingRepo.createRequest.bind(racingRepo);
    racingRepo.createRequest = async () => {
      const err = new Error('dup') as Error & { code?: string };
      err.code = '23505';
      throw err;
    };
    void original;
    const racingSvc = new FriendsService(racingRepo);
    await expect(racingSvc.sendRequest('1', 'bob')).rejects.toMatchObject({
      code: 'REQUEST_EXISTS',
    });
  });

  // ── 接受 / 拒绝 ──

  it('接受请求:收件人本人可接受', async () => {
    const f = await svc.sendRequest('1', 'bob');
    const accepted = await svc.acceptRequest('2', f.id);
    expect(accepted.status).toBe('accepted');
  });

  it('接受请求:非收件人 → FORBIDDEN', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await expect(svc.acceptRequest('3', f.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    // 发起人自己也不能接受自己发出的请求
    await expect(svc.acceptRequest('1', f.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('接受请求:不存在 → REQUEST_NOT_FOUND', async () => {
    await expect(svc.acceptRequest('2', '999')).rejects.toMatchObject({
      code: 'REQUEST_NOT_FOUND',
    });
  });

  it('接受请求:已接受的再接受 → REQUEST_NOT_FOUND(非 pending)', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.acceptRequest('2', f.id);
    await expect(svc.acceptRequest('2', f.id)).rejects.toMatchObject({
      code: 'REQUEST_NOT_FOUND',
    });
  });

  it('拒绝请求:收件人本人可拒绝(删除请求)', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.rejectRequest('2', f.id);
    const { incoming } = await svc.listRequests('2');
    expect(incoming).toHaveLength(0);
    // 拒绝后可以重新发起
    const again = await svc.sendRequest('1', 'bob');
    expect(again.status).toBe('pending');
  });

  it('拒绝请求:非收件人 → FORBIDDEN', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await expect(svc.rejectRequest('3', f.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  // ── 删除好友 ──

  it('删除好友:已是好友可删除', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.acceptRequest('2', f.id);
    await svc.removeFriend('1', '2');
    expect(await svc.listFriends('1')).toHaveLength(0);
    expect(await svc.listFriends('2')).toHaveLength(0);
  });

  it('删除好友:非好友 → NOT_FRIENDS', async () => {
    await expect(svc.removeFriend('1', '2')).rejects.toMatchObject({ code: 'NOT_FRIENDS' });
    // 仅 pending(未接受)也算非好友
    const f = await svc.sendRequest('1', 'bob');
    void f;
    await expect(svc.removeFriend('1', '2')).rejects.toMatchObject({ code: 'NOT_FRIENDS' });
  });

  // ── 好友关系校验(邀请前置) ──

  it('areFriends / requireFriends:仅 accepted 才为真', async () => {
    expect(await svc.areFriends('1', '2')).toBe(false);
    const f = await svc.sendRequest('1', 'bob');
    // pending 阶段尚不是好友
    expect(await svc.areFriends('1', '2')).toBe(false);
    await expect(svc.requireFriends('1', '2')).rejects.toMatchObject({ code: 'NOT_FRIENDS' });
    await svc.acceptRequest('2', f.id);
    expect(await svc.areFriends('1', '2')).toBe(true);
    // 顺序无关
    expect(await svc.areFriends('2', '1')).toBe(true);
    await expect(svc.requireFriends('1', '2')).resolves.toBeUndefined();
  });

  // ── 列表 ──

  it('好友列表:返回对方公开资料(双向均可见)', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.acceptRequest('2', f.id);
    const aliceFriends = await svc.listFriends('1');
    expect(aliceFriends).toHaveLength(1);
    expect(aliceFriends[0]).toMatchObject({ id: '2', username: 'bob' });
    // 公开资料不应泄露密码哈希等(类型层已保证,这里断言字段集合)
    expect(Object.keys(aliceFriends[0]).sort()).toEqual(
      ['avatarUrl', 'chips', 'id', 'nickname', 'status', 'username'].sort(),
    );
  });

  it('请求列表:incoming 与 outgoing 分别归类', async () => {
    await svc.sendRequest('1', 'bob'); // alice -> bob
    await svc.sendRequest('3', 'alice'); // carol -> alice

    const aliceReq = await svc.listRequests('1');
    expect(aliceReq.outgoing.map((r) => r.user.id)).toEqual(['2']);
    expect(aliceReq.incoming.map((r) => r.user.id)).toEqual(['3']);

    const bobReq = await svc.listRequests('2');
    expect(bobReq.incoming.map((r) => r.user.id)).toEqual(['1']);
    expect(bobReq.outgoing).toHaveLength(0);
  });

  it('请求列表:接受后从待处理中移除', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.acceptRequest('2', f.id);
    expect((await svc.listRequests('1')).outgoing).toHaveLength(0);
    expect((await svc.listRequests('2')).incoming).toHaveLength(0);
  });
});
