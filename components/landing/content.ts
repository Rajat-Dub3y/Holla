/**
 * All landing-page copy and the hero video live here so you can change them in one place.
 */

/**
 * Hero background video.
 * PLACEHOLDER: a free CC0 clip from MDN. Swap this one line when your own video is ready.
 * Best: put an .mp4 in /public/videos/hero.mp4 and use '/videos/hero.mp4'.
 * Keep it under ~6 MB, 10-20 seconds, no audio (it plays muted anyway).
 */
export const HERO_VIDEO_SRC =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/** Optional still shown while the video loads or if it fails. Leave '' for none. */
export const HERO_VIDEO_POSTER = '';

export const HERO_SCENES = [
  {
    her: 'nice',
    read: 'One word. Not a no. She is checking if you will carry the conversation.',
  },
  {
    her: 'haha you actually remembered that',
    read: 'A callback. She was listening. Lean in, do not over-explain.',
  },
  {
    her: 'we should get food sometime',
    read: 'Soft invite. Name a day. Waiting makes it go stale.',
  },
];

export const MARQUEE_WORDS = [
  'Read the signal',
  'One next move',
  'Check before you send',
  'Get the date',
  'Not a reply generator',
  'A coach',
];

export const TRY_SCENARIOS = [
  {
    id: 'one-word',
    label: 'One-word reply',
    her: 'nice',
    ring: 'nice',
    signal:
      'A one-word reply is not a dead end. It is a test: will you carry the conversation or let it die?',
    options: [
      {
        text: 'Nice? That is all I get? I poured my heart into that opener.',
        good: false,
        feedback: 'Too much pressure. You are making her feel bad for a short reply. She will pull away.',
      },
      {
        text: 'Okay, a person of few words. I respect that. What is something you are NOT few words about?',
        good: true,
        feedback:
          'Strong. You acknowledged the short reply without being weird, then pointed her at something she can actually talk about.',
      },
      {
        text: 'So what do you do for fun?',
        good: false,
        feedback: 'Too generic. It ignores the awkwardness and sounds like a form.',
      },
    ],
  },
  {
    id: 'fun',
    label: '"What do you do for fun?"',
    her: 'What do you do for fun?',
    ring: 'for fun',
    signal:
      'She is testing whether you are interesting beyond the profile. A list of hobbies will not do it. A small, specific story will.',
    options: [
      {
        text: 'Gym, movies, hanging out with friends. You?',
        good: false,
        feedback: 'Safe and forgettable. Every profile says this, so it gives her nothing to grab.',
      },
      {
        text: 'I climb, read weird books, and cook things that do not always work out. You?',
        good: true,
        feedback: 'Specific, a little vulnerable, and it ends with a question. That is the shape to aim for.',
      },
      {
        text: 'Lots of things. What about you?',
        good: false,
        feedback: 'It hands the work back to her. She asked you first.',
      },
    ],
  },
  {
    id: 'food',
    label: '"We should get food"',
    her: 'we should get food sometime',
    ring: 'sometime',
    signal:
      'A soft invite. "Sometime" is her leaving the door open for you to name the plan. Waiting makes it go stale.',
    options: [
      {
        text: 'Yeah definitely!',
        good: false,
        feedback: 'Warm, but it leaves "sometime" as sometime. Nothing is decided and the thread drifts.',
      },
      {
        text: 'Yes. Thursday or Saturday? I know a good spot, low key.',
        good: true,
        feedback: 'You turned "sometime" into two real options without pressure. That is how dates actually happen.',
      },
      {
        text: 'Let me check my schedule and get back to you.',
        good: false,
        feedback: 'It reads as lukewarm and formal. Interest cools while you wait.',
      },
    ],
  },
];

export const LOOP_STEPS = [
  {
    n: '01',
    title: 'She says something',
    desc: 'Paste her message or upload a screenshot. The coach reads it instantly.',
  },
  {
    n: '02',
    title: 'Get the read',
    desc: 'What she actually means, what signal she is sending, and why it matters right now.',
  },
  {
    n: '03',
    title: 'One next move',
    desc: 'Not ten options. One grounded suggestion, with the reasoning and not just the line.',
  },
  {
    n: '04',
    title: 'Send it, get feedback',
    desc: 'Paste your draft. The coach tells you if it works before you hit send.',
  },
];

export const QUIZ = [
  {
    her: 'Hey! Love your hiking photos. Where was that?',
    options: [
      { text: 'She is just being polite', correct: false, why: 'She asked a specific question about your photos. That is active interest.' },
      { text: 'She looked at your profile carefully', correct: true, why: 'She noticed a specific detail and asked about it. A strong engagement signal.' },
      { text: 'She is testing you', correct: false, why: 'Not everything is a test. Sometimes people just want to know you.' },
    ],
  },
  {
    her: 'What do you do for fun? Besides winning pizza debates obviously',
    options: [
      { text: 'She is making fun of you', correct: false, why: 'She is referencing your earlier chat. That is a callback.' },
      { text: 'She remembers what you said', correct: true, why: 'The callback shows she is invested. This is a good sign.' },
      { text: 'She is bored', correct: false, why: 'A bored person does not add a joke. She is keeping it light.' },
    ],
  },
  {
    her: 'lol ok',
    options: [
      { text: 'She is angry', correct: false, why: 'Short is not angry. Do not apologise for nothing.' },
      { text: 'Energy is dropping. Change the pace', correct: true, why: 'Short, flat replies mean the thread needs a new angle, not more of the same.' },
      { text: 'She wants you to double text', correct: false, why: 'Chasing a flat reply with more messages usually makes it flatter.' },
    ],
  },
];

export const COMPARE = {
  her: 'k',
  without: {
    label: 'On your own',
    draft: 'Did I say something wrong?? Sorry if I did',
    outcome: 'Overthinking turns one letter into a problem. She feels the pressure and the energy drops.',
  },
  with: {
    label: 'With Holla',
    draft: 'Fair, long day? Tell me the best and worst part and I will tell you mine.',
    outcome: 'The coach reads it as low energy, not anger, and gives you a light, easy way back in.',
  },
};

/** Original coaching principles (not attributed to any real person). */
export const PRINCIPLES = [
  { n: '01', title: 'Specific beats clever', body: 'A detail from her profile does more than a line you found online.' },
  { n: '02', title: 'Match energy, do not chase it', body: 'If she sends four words, you do not need to send four paragraphs.' },
  { n: '03', title: 'One question at a time', body: 'Stack questions and it feels like an interview. Ask one and mean it.' },
  { n: '04', title: 'Short is not cold', body: 'Read the pattern across messages before reading anything into one.' },
  { n: '05', title: 'Plan, do not pitch', body: 'Two real options for a day beats "we should hang out sometime".' },
  { n: '06', title: 'Ask before it goes stale', body: 'The window to suggest meeting is shorter than most people think.' },
];
