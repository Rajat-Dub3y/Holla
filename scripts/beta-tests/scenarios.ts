/**
 * The 26 scenarios from Part 5 of the Beta Phase 1 brief (A1 to G2).
 * Each is fed to the pipeline as typed text (screenshots are tested by hand).
 * `brief` holds the boss's example so the report can show actual vs example.
 */
export type Scenario = {
  id: string;
  group: string;
  title: string;
  tab: "reply" | "opener";
  /** What the tester types or pastes. */
  text: string;
  /** Earlier turns, for multi-turn scenarios. */
  history?: Array<{ sender: "her" | "him"; text: string }>;
  firstMover?: "auto" | "she" | "me";
  expectMode: "opener" | "reply" | "follow_up" | "fix_my_text";
  expectRecStyle?: Array<"playful" | "curious" | "assertive" | "warm">;
  /** The recommended reply must propose a date (day/place/drink/coffee). */
  expectDate?: boolean;
  /** The recommended reply must NOT push a date (vague/early). */
  expectNoDate?: boolean;
  /** For openers: expect the "I have not seen her profile" note. */
  expectNoProfileNote?: boolean;
  brief: { read: string; replies: Array<{ style: string; text: string }> };
};

const H = (sender: "her" | "him", text: string) => ({ sender, text });

export const SCENARIOS: Scenario[] = [
  // A. Openers
  {
    id: "A1", group: "Openers", title: "Hinge prompt: Sunday markets", tab: "opener",
    text: `Her Hinge prompt: "My simple pleasures: Sunday markets and a good flat white"`,
    expectMode: "opener", expectRecStyle: ["playful"],
    brief: { read: "She's told you how she likes to spend her time. Use it.", replies: [
      { style: "playful", text: "Sunday markets and a flat white is an elite combo. Be honest, how many tote bags do you own?" },
      { style: "curious", text: "What's the best thing you've ever found at a Sunday market?" },
      { style: "assertive", text: "Market wander and a flat white sounds like a perfect Sunday. You pick the market, I'll judge the coffee." } ] },
  },
  {
    id: "A2", group: "Openers", title: "Photo: hiking, mountain view", tab: "opener",
    text: "Her photo: she is hiking, big mountain view behind her. No bio.",
    expectMode: "opener", expectRecStyle: ["curious"],
    brief: { read: "", replies: [
      { style: "curious", text: "Okay, that mountain photo, where is that? It looks unreal." },
      { style: "playful", text: "That view is making my weekend look very average." },
      { style: "assertive", text: "Anyone who hikes that far for a photo has good stories. Tell me one." } ] },
  },
  {
    id: "A3", group: "Openers", title: "Photo: a dog", tab: "opener",
    text: "Her photo: she is with a dog (photo 3). No bio.",
    expectMode: "opener", expectRecStyle: ["playful"],
    brief: { read: "", replies: [
      { style: "playful", text: "Important question first: is the dog in photo 3 yours, and is his name as good as he is?" },
      { style: "curious", text: "Your dog looks like he runs the house. What's his name?" } ] },
  },
  {
    id: "A4", group: "Openers", title: "Almost nothing on her profile", tab: "opener",
    text: "Her profile has a few photos but no bio and no prompts.",
    expectMode: "opener", expectRecStyle: ["playful"], expectNoProfileNote: true,
    brief: { read: "Give her an easy, fun choice to answer.", replies: [
      { style: "playful", text: "Your profile's a bit of a mystery, so I'll guess: big Sunday brunch person or coffee-and-go?" },
      { style: "curious", text: "Your profile's keeping its secrets. What's one thing I wouldn't guess about you?" } ] },
  },
  // B. She sent the first message
  {
    id: "B1", group: "She messaged first", title: '"heyy 😊"', tab: "reply", text: "heyy 😊", firstMover: "she",
    expectMode: "reply", expectRecStyle: ["playful", "assertive"],
    brief: { read: "She matched you and said hey. Low effort, not low interest. You lead.", replies: [
      { style: "playful", text: "Hey! Strong opener, I respect it. What's been the best part of your week so far?" },
      { style: "curious", text: "Hey, glad you said hi. I have to ask about [detail from her profile], what's the story there?" },
      { style: "assertive", text: "Hey you. Quick one so we skip the small talk: coffee person or wine person?" } ] },
  },
  {
    id: "B2", group: "She messaged first", title: '"Hi, how are you?"', tab: "reply", text: "Hi, how are you?", firstMover: "she",
    expectMode: "reply", expectRecStyle: ["curious", "warm"],
    brief: { read: "Polite and open. Don't send 'good u?'. Answer with something real, then hand it back.", replies: [
      { style: "curious", text: "Pretty good, survived a long Monday on too much coffee. How about you, what's keeping you busy?" },
      { style: "playful", text: "Honestly? Better now. That sounded smoother in my head. How's yours going?" },
      { style: "warm", text: "Good, thanks! Just back from the gym and justifying pizza. What are you up to tonight?" } ] },
  },
  {
    id: "B3", group: "She messaged first", title: '"Bumble says I have to go first so... hi 😅"', tab: "reply",
    text: "Bumble says I have to go first so... hi 😅", firstMover: "she",
    expectMode: "reply", expectRecStyle: ["playful"],
    brief: { read: "She's a bit awkward about it and joking. Match the joke, take the pressure off.", replies: [
      { style: "playful", text: "And you nailed it. Pressure's on me now. Okay, best thing you've eaten this week, go." },
      { style: "curious", text: "Ha, you did great. So what made you swipe right?" } ] },
  },
  {
    id: "B4", group: "She messaged first", title: '"Your profile made me laugh"', tab: "reply",
    text: "Your profile made me laugh", firstMover: "she",
    expectMode: "reply", expectRecStyle: ["playful"],
    brief: { read: "High interest. Take the compliment lightly, don't over-thank.", replies: [
      { style: "playful", text: "Mission accomplished. Your [detail] made me smile too, what's the story there?" },
      { style: "curious", text: "Glad someone gets my humour. What made you laugh? Be specific, my ego needs it." } ] },
  },
  // C. Short replies
  {
    id: "C1", group: "Short replies", title: '"lol"', tab: "reply", text: "lol",
    history: [H("him", "I once got stuck in a revolving door for a solid minute")],
    expectMode: "reply", expectRecStyle: ["playful", "curious"],
    brief: { read: "She liked it but didn't add anything. Don't ask what's funny. Start a new thread.", replies: [
      { style: "playful", text: "Glad I'm entertaining someone today. Real question: what does your perfect Saturday look like?" },
      { style: "curious", text: "Okay, your turn. What's the last thing that made you properly laugh?" } ] },
  },
  {
    id: "C2", group: "Short replies", title: '"good thanks" (no question back)', tab: "reply", text: "good thanks",
    history: [H("him", "Hey, how's your week going?")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["playful", "curious"],
    brief: { read: "Could be busy, shy, or not a texter. Low signal, not a no. Make it easy.", replies: [
      { style: "playful", text: "Glad to hear it. Settle a debate for me: pineapple on pizza, yes or no?" },
      { style: "curious", text: "Good to hear. What's been the highlight of your week?" } ] },
  },
  {
    id: "C3", group: "Short replies", title: '"I\'m going on holiday soon"', tab: "reply", text: "I'm going on holiday soon",
    history: [H("him", "Hey, how's your week going?"), H("her", "good thanks, how are you?"), H("him", "Not bad, just back from the gym. Any plans this month?")],
    expectMode: "reply", expectRecStyle: ["curious"],
    brief: { read: "She volunteered something about herself. That's interest. She's inviting you to ask.", replies: [
      { style: "curious", text: "Nice! Where to? And are you a plan-every-hour traveller or a figure-it-out-when-we-land one?" },
      { style: "playful", text: "Jealous. Where are you off to, and is there room in the suitcase?" },
      { style: "assertive", text: "Love that. Where to? You'll have to tell me about it over a drink when you're back." } ] },
  },
  {
    id: "C4", group: "Short replies", title: '"Nothing much, just chilling"', tab: "reply", text: "Nothing much, just chilling",
    history: [H("him", "Hey! What are you up to tonight?")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["curious", "playful"],
    brief: { read: "", replies: [
      { style: "curious", text: "Chilling is underrated. What's your go-to way to switch off?" },
      { style: "playful", text: "Sounds dangerous. What's on the TV tonight?" } ] },
  },
  {
    id: "C5", group: "Short replies", title: '"yeah" / "true" / "same"', tab: "reply", text: "yeah",
    history: [H("him", "Monday mornings should be illegal"), H("her", "haha true"), H("him", "Coffee is the only thing keeping me going"), H("her", "same")],
    expectMode: "reply", expectRecStyle: ["assertive"],
    brief: { read: "The thread has run out. Don't keep pushing it. Change topic, or if the chat's been good, ask her out.", replies: [
      { style: "assertive", text: "Okay, new topic, because that one's had its day. Best place you've been this year?" } ] },
  },
  // D. She asks a question
  {
    id: "D1", group: "She asks a question", title: '"Where are you from?"', tab: "reply", text: "Where are you from?",
    history: [H("him", "Hey, nice to match with you")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["playful", "curious"],
    brief: { read: "", replies: [
      { style: "playful", text: "Born in [city], now in [city], long story involving a job and a lot of rain. What about you, local or a transplant?" },
      { style: "playful", text: "Guess. Three tries. If you get it, I'm buying the first round." },
      { style: "curious", text: "[city] originally. Do you know it, or do I need to sell it to you?" } ] },
  },
  {
    id: "D2", group: "She asks a question", title: '"What are you looking for on here?"', tab: "reply", text: "What are you looking for on here?",
    history: [H("him", "Hey, nice to match with you"), H("her", "Hi! Thanks")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["warm", "assertive"],
    brief: { read: "She's checking you're serious. Be honest and confident, not heavy. Never 'idk just seeing'.", replies: [
      { style: "warm", text: "Honestly? Someone I actually click with. I'd rather meet and see if there's a spark than be pen pals forever. You?" },
      { style: "assertive", text: "Something real with someone fun. Not here to collect matches. What about you?" } ] },
  },
  {
    id: "D3", group: "She asks a question", title: '"That photo looks cool, where was it taken?"', tab: "reply",
    text: "That photo looks cool, where was it taken?",
    history: [H("him", "Hey, nice to match with you")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["curious", "playful"],
    brief: { read: "She's been looking at your profile properly. Tell a tiny story and link it back to her.", replies: [
      { style: "curious", text: "[Place] last summer, spent most of that trip lost and eating too much. Do you travel much?" },
      { style: "playful", text: "That's me pretending I'm in a film. Real answer: [place]. Ever been?" } ] },
  },
  {
    id: "D4", group: "She asks a question", title: '"What do you do?"', tab: "reply", text: "What do you do?",
    history: [H("him", "Hey, nice to match with you"), H("her", "Hey! You too")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["curious", "playful"],
    brief: { read: "", replies: [
      { style: "curious", text: "I'm in [job]. Sounds boring on paper, but [one interesting thing]. What about you?" },
      { style: "playful", text: "Guess based on my photos. Wrong answers are very welcome." } ] },
  },
  {
    id: "D5", group: "She asks a question", title: '"Any plans this weekend?"', tab: "reply", text: "Any plans this weekend?",
    history: [H("him", "Hey, how's your week?"), H("her", "Busy but good! You?"), H("him", "Same, surviving on coffee. What do you do to switch off?"), H("her", "Gym and trashy TV haha")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["assertive"], expectDate: true,
    brief: { read: "This is a door. If the chat's been good, use it to seed a date.", replies: [
      { style: "assertive", text: "Football Saturday, Sunday's wide open. What are you up to? You might have to steal Sunday." },
      { style: "curious", text: "Not much yet. What's a perfect weekend for you?" } ] },
  },
  // E. Multi-turn
  {
    id: "E1", group: "Multi-turn", title: "Him: how's your week? Her: good thanks, how are you?", tab: "reply",
    text: "good thanks, how are you?", history: [H("him", "hey, how's your week going?")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["curious", "playful"],
    brief: { read: "Polite and returned the question, so she's engaged.", replies: [
      { style: "curious", text: "Not bad at all, finally booked a trip I've been putting off. What's the best trip you've ever taken?" },
      { style: "playful", text: "Good, apart from losing a debate with my mate about the best takeaway. Back me up: curry or pizza?" } ] },
  },
  {
    id: "E2", group: "Multi-turn", title: '"Just got back from Lisbon, it was amazing"', tab: "reply",
    text: "Just got back from Lisbon, it was amazing",
    history: [H("him", "Hey, how's your week going?"), H("her", "Good thanks! How are you?"), H("him", "Pretty good. Any trips planned this year?")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["curious", "warm"],
    brief: { read: "She's excited and sharing. Get her talking about it. Relate briefly, don't make it about you.", replies: [
      { style: "curious", text: "Lisbon's high on my list. What was the best thing you ate?" },
      { style: "warm", text: "That's brilliant. What was the highlight?" } ] },
  },
  {
    id: "E3", group: "Multi-turn", title: '"Bet you say that to all the girls"', tab: "reply",
    text: "Bet you say that to all the girls",
    history: [H("him", "Hey, nice to match with you"), H("her", "Hi! You too"), H("him", "Your smile in the second photo is great")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["playful"],
    brief: { read: "Playful test. Don't defend yourself. Play along.", replies: [
      { style: "playful", text: "Only on Tuesdays. You got lucky." },
      { style: "assertive", text: "Only the ones worth saying it to. Shortlist's very short." } ] },
  },
  // F. Moving to a date
  {
    id: "F1", group: "Moving to a date", title: "Chat going well, no date mentioned yet", tab: "reply",
    text: "haha yes!! that film is so underrated 😂 what's your favourite?",
    history: [
      H("him", "Hey, how's your week going?"), H("her", "Great thanks! Just got back from Lisbon 😍"),
      H("him", "Lisbon's high on my list. Best thing you ate?"), H("her", "The custard tarts, no contest. What about you, where's your dream trip?"),
      H("him", "Japan. Mainly for the food and the questionable karaoke"), H("her", "omg karaoke!! I'm so bad at it but I love it 😂"),
      H("him", "Bad is the only acceptable standard. Favourite film for a rewatch?"),
    ], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["assertive"], expectDate: true,
    brief: { read: "A few good back-and-forths, she's engaged. Ask her out with a specific day and place.", replies: [
      { style: "assertive", text: "I'm enjoying this, but I think you'd be even more fun in person. Drink at [place] on Thursday?" },
      { style: "playful", text: "We've covered travel, food and your questionable film taste. Next step is obviously a drink. Thursday or Saturday?" } ] },
  },
  {
    id: "F2", group: "Moving to a date", title: '"Sure! When are you free?"', tab: "reply", text: "Sure! When are you free?",
    history: [H("him", "I think you'd be more fun in person. Drink this week?")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["assertive"], expectDate: true,
    brief: { read: "Green light. Be decisive. Don't send 'whenever suits you'.", replies: [
      { style: "assertive", text: "Thursday, 7:30 at [place]? I'll book a table." } ] },
  },
  {
    id: "F3", group: "Moving to a date", title: '"Maybe sometime" / "I\'m pretty busy"', tab: "reply",
    text: "Maybe sometime, I'm pretty busy at the moment",
    history: [H("him", "You're fun to talk to. Drink this week?")], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["playful", "warm"],
    brief: { read: "Not a yes, not a no. Keep it light, offer one easy option, don't push.", replies: [
      { style: "playful", text: "Sometime works. Quick coffee Sunday, low pressure, and if I'm boring you can leave after one." },
      { style: "warm", text: "No rush at all. Let me know when things calm down and I'll show you the best coffee in town." } ] },
  },
  // G. Going cold
  {
    id: "G1", group: "Going cold", title: "She hasn't replied in two or three days", tab: "reply",
    text: "She hasn't replied in 3 days.",
    history: [H("her", "I'm going on holiday soon!"), H("him", "Nice! Where to?")], firstMover: "me",
    expectMode: "follow_up", expectNoDate: true,
    brief: { read: "People get busy. One light follow-up, no guilt trip. Never '?' or 'guess you're not interested'.", replies: [
      { style: "playful", text: "I've decided that holiday you mentioned kidnapped you. Hope it's going well!" } ] },
  },
  {
    id: "G2", group: "Going cold", title: "Her replies are getting shorter each time", tab: "reply",
    text: "ok",
    history: [
      H("him", "How was your day? Anything fun?"), H("her", "Yeah it was good, went for a long walk by the river, then cooked a ridiculous amount of pasta"),
      H("him", "Respect. Sauce from scratch?"), H("her", "yep"),
      H("him", "Dangerous. What's the signature dish?"), H("her", "lol idk"),
      H("him", "Fair. Weekend plans?"),
    ], firstMover: "me",
    expectMode: "reply", expectRecStyle: ["assertive"], expectDate: true,
    brief: { read: "Energy is dropping. Switch to a fresh fun topic now or go straight for the date before it dies.", replies: [
      { style: "assertive", text: "I'm better in person than over text, I promise. Coffee this week?" } ] },
  },
];