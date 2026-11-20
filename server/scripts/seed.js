/**
 * Seeds Connectly with an admin, a demo user, friends and realistic example chats.
 *
 *   npm run seed          -> adds the demo data (skips if the demo user already exists)
 *   npm run seed:reset    -> wipes users, conversations and messages first
 *
 * Logins created:
 *   demo@connectly.app   /  Demo@12345   (regular user with lots of chats)
 *   admin@connectly.app  /  Admin@12345  (admin; override with SEED_ADMIN_PASSWORD)
 *   every other seeded user uses Demo@12345
 */
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { connectDB } from '../config/db.js'
import User from '../models/User.js'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'

const DEMO_PASSWORD = 'Demo@12345'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345'

const PEOPLE = [
  { key: 'admin', name: 'Connectly Team', username: 'connectly', email: 'admin@connectly.app', role: 'admin', password: ADMIN_PASSWORD, bio: 'Official Connectly support & announcements.', statusMessage: 'Here to help 💬' },
  { key: 'demo', name: 'Demo User', username: 'demo', email: 'demo@connectly.app', bio: 'Trying out Connectly — the messaging app with taste.', statusMessage: 'Exploring Connectly ✨', location: 'Karachi' },
  { key: 'aisha', name: 'Aisha Khan', username: 'aisha.khan', email: 'aisha@connectly.app', bio: 'Product designer. Coffee first, pixels second.', statusMessage: 'In deep focus 🎧', location: 'Lahore' },
  { key: 'hamza', name: 'Hamza Ali', username: 'hamza_ali', email: 'hamza@connectly.app', bio: 'Full-stack dev · building in public.', statusMessage: 'Shipping on Fridays 🚀', location: 'Karachi' },
  { key: 'sara', name: 'Sara Ahmed', username: 'sara.ahmed', email: 'sara@connectly.app', bio: 'Frontend engineer. I like tidy CSS.', statusMessage: 'Available', location: 'Islamabad' },
  { key: 'bilal', name: 'Bilal Raza', username: 'bilalraza', email: 'bilal@connectly.app', bio: 'Cricket, chai and code.', statusMessage: 'At the nets 🏏', location: 'Karachi' },
  { key: 'maryam', name: 'Maryam Noor', username: 'maryam.noor', email: 'maryam@connectly.app', bio: 'UX researcher & amateur photographer.', statusMessage: 'Out of office until Monday', location: 'Multan' },
  { key: 'zain', name: 'Zain Malik', username: 'zainmalik', email: 'zain@connectly.app', bio: 'Backend engineer. Mongo enthusiast.', statusMessage: '', location: 'Karachi' },
  { key: 'fatima', name: 'Fatima Sheikh', username: 'fatima.s', email: 'fatima@connectly.app', bio: 'Student · learning the MERN stack.', statusMessage: 'Studying 📚', location: 'Hyderabad' },
]

const minsAgo = (m) => new Date(Date.now() - m * 60 * 1000)

async function run() {
  await connectDB()

  if (process.argv.includes('--reset')) {
    await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})])
    console.log('🧹 Cleared users, conversations and messages')
  } else if (await User.exists({ email: 'demo@connectly.app' })) {
    console.log('ℹ️  Demo data already exists. Run "npm run seed:reset" to rebuild it.')
    return
  }

  // ---- users ----
  const U = {}
  for (const p of PEOPLE) {
    const { key, password, ...rest } = p
    const user = new User({ ...rest, password: password || DEMO_PASSWORD, isVerified: true, lastSeen: minsAgo(Math.floor(Math.random() * 300) + 5) })
    await user.save()
    U[key] = user
  }
  console.log(`👥 Created ${PEOPLE.length} users`)

  // ---- helpers ----
  const direct = async (a, b) =>
    Conversation.create({
      isGroup: false,
      directKey: [String(U[a]._id), String(U[b]._id)].sort().join('_'),
      createdBy: U[a]._id,
      members: [{ user: U[a]._id }, { user: U[b]._id }],
    })

  const group = async (name, description, creator, memberKeys, admins = []) =>
    Conversation.create({
      isGroup: true,
      name,
      description,
      createdBy: U[creator]._id,
      members: memberKeys.map((k) => ({ user: U[k]._id, role: k === creator || admins.includes(k) ? 'admin' : 'member' })),
    })

  /**
   * lines: [fromKey, text, minutesAgo, options?]
   * options: { state: 'read'|'delivered'|'sent', reply: index, react: { userKey: emoji }, system: true, edited: true, forwarded: true }
   */
  async function talk(conv, lines) {
    const memberKeys = conv.members.map((m) => Object.keys(U).find((k) => String(U[k]._id) === String(m.user)))
    const made = []
    for (const [from, text, ago, opts = {}] of lines) {
      const recipients = memberKeys.filter((k) => k !== from).map((k) => U[k]._id)
      const state = opts.state || 'read'
      const m = await Message.create({
        conversation: conv._id,
        sender: U[from]._id,
        type: opts.system ? 'system' : 'text',
        text,
        replyTo: opts.reply !== undefined ? made[opts.reply]._id : null,
        forwarded: Boolean(opts.forwarded),
        editedAt: opts.edited ? minsAgo(ago - 1) : undefined,
        reactions: Object.entries(opts.react || {}).map(([k, emoji]) => ({ user: U[k]._id, emoji })),
        readBy: [U[from]._id, ...(state === 'read' ? recipients : [])],
        seenBy: state === 'read' && !opts.system ? recipients : [],
        deliveredTo: state !== 'sent' && !opts.system ? recipients : [],
        createdAt: minsAgo(ago),
        updatedAt: minsAgo(ago),
      })
      made.push(m)
    }
    const last = made[made.length - 1]
    await Conversation.updateOne({ _id: conv._id }, { $set: { lastMessage: last._id, lastActivity: last.createdAt } })
    return made
  }

  // ---- 1. Welcome from the team ----
  const welcome = await direct('admin', 'demo')
  await talk(welcome, [
    ['admin', 'Welcome to Connectly, Demo! 👋', 4300, { state: 'read' }],
    ['admin', 'Everything you see here is real: your messages live in MongoDB and travel over Socket.IO.', 4299, { state: 'read' }],
    ['admin', 'Try replying, reacting with an emoji, editing a message, or creating a group. Have fun!', 14, { state: 'delivered' }],
  ])

  // ---- 2. Aisha (unread messages, reply + reactions) ----
  const aisha = await direct('aisha', 'demo')
  await talk(aisha, [
    ['aisha', 'Hey! Did you get a chance to look at the new onboarding flow?', 2890],
    ['demo', 'Yes! The progress indicator is lovely. One thing: the skip button feels hidden.', 2880, { react: { aisha: '👍' } }],
    ['aisha', 'Good catch. I will make it more prominent 🙌', 2870, { reply: 1 }],
    ['demo', 'Perfect. Also can we use italics for the section headings? I think it adds a nice editorial feel.', 2860],
    ['aisha', 'Love that idea. Instrument Serif italic would look great there.', 2850, { react: { demo: '❤️' } }],
    ['demo', 'Shipping the prototype tomorrow — will send you the link.', 130, { state: 'read' }],
    ['aisha', 'Amazing, cannot wait!', 42, { state: 'delivered' }],
    ['aisha', 'Also — lunch on Friday? The new ramen place opened 🍜', 41, { state: 'delivered' }],
  ])

  // ---- 3. Hamza (pinned, long dev chat) ----
  const hamza = await direct('hamza', 'demo')
  await talk(hamza, [
    ['hamza', 'Bro, did you push the socket handlers yet?', 1500],
    ['demo', 'Yep, just merged. Typing indicators and read receipts are in.', 1495],
    ['hamza', 'Nice. Are we storing readBy on the message or on the conversation?', 1490],
    ['demo', 'On the message — a counter per conversation is just an aggregate away.', 1485, { react: { hamza: '🔥' } }],
    ['hamza', 'Makes sense. One query, one index. Clean.', 1480],
    ['hamza', 'Btw JWT in an HTTP-only cookie is the right call. No more localStorage tokens.', 1475, { react: { demo: '💯' } }],
    ['demo', 'Exactly. And sameSite=lax keeps CSRF in check for same-site deploys.', 1470],
    ['hamza', 'I will review the PR tonight. Deploy Friday?', 600, { edited: true }],
    ['demo', 'Friday works 🚀', 580],
  ])

  // ---- 4. Sara ----
  const sara = await direct('sara', 'demo')
  await talk(sara, [
    ['sara', 'Quick question — Tailwind v4 or stick with v3 for the dashboard?', 7200],
    ['demo', 'v4. The CSS-first config is so much nicer and it is fast.', 7190],
    ['sara', 'Sold. Migrating this weekend.', 7185],
    ['sara', 'Thanks for the help earlier 🙏', 3000],
    ['demo', 'Anytime!', 2990],
  ])

  // ---- 5. Bilal (archived) ----
  const bilal = await direct('bilal', 'demo')
  await talk(bilal, [
    ['bilal', 'Net session on Sunday morning?', 10000],
    ['demo', 'Count me in. 7am?', 9990],
    ['bilal', 'Done. Bring your bat 😄', 9985],
  ])
  await Conversation.updateOne({ _id: bilal._id }, { $addToSet: { archivedBy: U.demo._id } })

  // ---- 6. Groups ----
  const design = await group('Design Team ✨', 'Everything about visuals, type and motion.', 'aisha', ['aisha', 'demo', 'sara', 'maryam'], ['sara'])
  await talk(design, [
    ['aisha', 'Aisha created the group "Design Team ✨"', 5900, { system: true }],
    ['aisha', 'Welcome everyone! This is where we share work-in-progress and feedback.', 5890],
    ['maryam', 'Sharing the research summary tomorrow. Spoiler: users love the italic headings.', 5880, { react: { aisha: '🎉', sara: '👏' } }],
    ['sara', 'Nice! I will update the type scale in the component library.', 5870],
    ['demo', 'Can we also add a dark theme preview to the review board?', 360],
    ['aisha', 'Yes — I will add a toggle to the Figma frame.', 340, { reply: 4 }],
    ['maryam', 'Dark mode screenshots are in the folder now 🌙', 90, { state: 'delivered' }],
  ])

  const cricket = await group('Weekend Cricket 🏏', 'Sunday matches, nets and snacks.', 'demo', ['demo', 'bilal', 'zain', 'hamza'])
  await talk(cricket, [
    ['demo', 'Demo User created the group "Weekend Cricket 🏏"', 3400, { system: true }],
    ['bilal', 'Ground is booked for Sunday 8am!', 3390],
    ['zain', 'I will bring the stumps and the water cooler.', 3385, { react: { demo: '🙌' } }],
    ['hamza', 'Who is bringing chai?', 3380],
    ['bilal', 'Obviously me. It is non-negotiable.', 3375, { react: { hamza: '😂', zain: '😂' } }],
    ['demo', 'See you all there. First over is mine!', 3370],
  ])

  // ---- 7. A few chats between other people (useful for the admin monitor) ----
  const ah = await direct('aisha', 'hamza')
  await talk(ah, [
    ['aisha', 'Can you expose a /health route for the status page?', 2000],
    ['hamza', 'Already did — /api/health returns status and time.', 1990],
  ])
  const fz = await direct('fatima', 'zain')
  await talk(fz, [
    ['fatima', 'How do I populate a nested field in Mongoose?', 800],
    ['zain', 'populate({ path, populate: { path } }) — I will send an example.', 790],
    ['fatima', 'Thank you so much!', 780],
  ])

  // ---- pin Hamza's chat for the demo user ----
  await Conversation.updateOne({ _id: hamza._id }, { $addToSet: { pinnedBy: U.demo._id } })

  console.log('💬 Created example conversations')
  console.log('\n✅ Seed complete. You can log in with:')
  console.log('   demo@connectly.app   /  Demo@12345')
  console.log(`   admin@connectly.app  /  ${ADMIN_PASSWORD}\n`)
}

run()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
    void env
  })
