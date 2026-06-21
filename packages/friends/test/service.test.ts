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

  it('发起请求:成功创建规范化 pending(low<high,initiator=发起方)', async () => {
    const f = await svc.sendRequest('1', 'bob');
    expect(f.status).toBe('pending');
    // 规范化无序对:小 id 在前
    expect(f.requesterId).toBe('1');
    expect(f.addresseeId).toBe('2');
    expect(f.initiatorId).toBe('1');
  });

  it('发起请求:大 id 发起也规范化为 low<high,但 initiator 记发起方', async () => {
    // bob(2) -> alice(1):规范化对仍是 (1,2),发起方为 2
    const f = await svc.sendRequest('2', 'alice');
    expect(f.requesterId).toBe('1');
    expect(f.addresseeId).toBe('2');
    expect(f.initiatorId).toBe('2');
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

  it('发起请求:同向重复(同一发起方)→ REQUEST_EXISTS', async () => {
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
    await svc.sendRequest('2', 'alice'); // bob -> alice(initiator=2)
    const f = await svc.sendRequest('1', 'bob'); // alice -> bob 触发自动接受
    expect(f.status).toBe('accepted');
    // 双方好友列表都应出现对方
    expect((await svc.listFriends('1')).map((u) => u.id)).toContain('2');
    expect((await svc.listFriends('2')).map((u) => u.id)).toContain('1');
  });

  it('跨方向并发:A→B 与 B→A 仅产生一条 accepted 好友', async () => {
    await svc.sendRequest('1', 'bob'); // alice -> bob,pending(initiator=1)
    const f = await svc.sendRequest('2', 'alice'); // bob -> alice,命中反向 pending → 自动接受
    expect(f.status).toBe('accepted');
    // 各自好友列表恰好一条,不会因双行而重复计数
    const aliceFriends = await svc.listFriends('1');
    const bobFriends = await svc.listFriends('2');
    expect(aliceFriends).toHaveLength(1);
    expect(bobFriends).toHaveLength(1);
    expect(aliceFriends[0].id).toBe('2');
    expect(bobFriends[0].id).toBe('1');
  });

  it('createRequest:对已存在的规范化对再插入被去重(仿唯一约束)', async () => {
    await repo.createRequest('1', '2', '1', 'pending');
    // 同一规范化对(1,2)再插入应抛 23505
    await expect(repo.createRequest('1', '2', '2', 'pending')).rejects.toMatchObject({
      code: '23505',
    });
  });

  it('发起请求:唯一约束冲突(并发)兜底解析为已存在/自动接受', async () => {
    // 模拟"between 查不到但插入冲突"的竞态:首次 between 返回 null,createRequest 抛 23505,
    // 兜底重读时返回反向 pending,服务应自动接受。
    const racingRepo = new InMemoryFriendsRepository();
    racingRepo.seedUser(user('1', 'alice'));
    racingRepo.seedUser(user('2', 'bob'));
    let betweenCalls = 0;
    const realBetween = racingRepo.findFriendshipBetween.bind(racingRepo);
    racingRepo.findFriendshipBetween = async (a: string, b: string) => {
      betweenCalls += 1;
      // 第一次(插入前)假装查不到;之后(兜底重读)走真实查询
      if (betweenCalls === 1) return null;
      return realBetween(a, b);
    };
    // 预置一条反向 pending(initiator=2),让兜底重读命中并自动接受
    await racingRepo.createRequest('1', '2', '2', 'pending');
    const racingSvc = new FriendsService(racingRepo);
    const f = await racingSvc.sendRequest('1', 'bob');
    expect(f.status).toBe('accepted');
  });

  // ── 接受 / 拒绝 ──

  it('接受请求:收件人(非发起方)本人可接受', async () => {
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

  it('接受请求:大 id 发起时,收件人为小 id 一方', async () => {
    const f = await svc.sendRequest('2', 'alice'); // bob(2) 发起,收件人为 alice(1)
    // 发起方 bob 不能接受
    await expect(svc.acceptRequest('2', f.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const accepted = await svc.acceptRequest('1', f.id);
    expect(accepted.status).toBe('accepted');
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
    // 发起人也不能拒绝自己发出的请求
    await expect(svc.rejectRequest('1', f.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  // ── 删除好友 ──

  it('删除好友:已是好友可删除', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.acceptRequest('2', f.id);
    await svc.removeFriend('1', '2');
    expect(await svc.listFriends('1')).toHaveLength(0);
    expect(await svc.listFriends('2')).toHaveLength(0);
  });

  it('删除好友:顺序无关(用大 id 视角删除)', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.acceptRequest('2', f.id);
    await svc.removeFriend('2', '1');
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

  it('请求列表:incoming 与 outgoing 按 initiator 归类', async () => {
    await svc.sendRequest('1', 'bob'); // alice -> bob(initiator=1)
    await svc.sendRequest('3', 'alice'); // carol -> alice(initiator=3)

    const aliceReq = await svc.listRequests('1');
    expect(aliceReq.outgoing.map((r) => r.user.id)).toEqual(['2']);
    expect(aliceReq.incoming.map((r) => r.user.id)).toEqual(['3']);

    const bobReq = await svc.listRequests('2');
    expect(bobReq.incoming.map((r) => r.user.id)).toEqual(['1']);
    expect(bobReq.outgoing).toHaveLength(0);
  });

  it('请求列表:大 id 发起时仍正确归类收/发', async () => {
    await svc.sendRequest('2', 'alice'); // bob(2) -> alice(1),initiator=2
    // alice 视角:这是收到的请求,对方是 bob
    const aliceReq = await svc.listRequests('1');
    expect(aliceReq.incoming.map((r) => r.user.id)).toEqual(['2']);
    expect(aliceReq.outgoing).toHaveLength(0);
    // bob 视角:这是发出的请求,对方是 alice
    const bobReq = await svc.listRequests('2');
    expect(bobReq.outgoing.map((r) => r.user.id)).toEqual(['1']);
    expect(bobReq.incoming).toHaveLength(0);
  });

  it('请求列表:接受后从待处理中移除', async () => {
    const f = await svc.sendRequest('1', 'bob');
    await svc.acceptRequest('2', f.id);
    expect((await svc.listRequests('1')).outgoing).toHaveLength(0);
    expect((await svc.listRequests('2')).incoming).toHaveLength(0);
  });
});
