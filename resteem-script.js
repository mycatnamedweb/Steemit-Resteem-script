// TODO:

// put it in profile
// update this to edit my post with the latest link @@ ( ~4pm.. -> use 9, backup time? Note: only if page found )


// ####### yougotresteemed
// NOTE: yougotresteemed -->
// Credits: thanks to @gasaeightyfive for the automation tool! :)
// + contract? (Terms & Conditions - they stop using if..)
// "You are not allowed to share this with other people unless I give my consent." Ok with that? :)
// '-> See "4. execute code given pwd"
//
// VS new partner(s): @kayyam09 (900), ..



// Will require support --> something breaks (UI changes), bug fixes their code / my code, etc.. Price for continued support is:
// lose data and need instructions on how to recover, migration to new system for users that you currently have, small change requests, etc
// + on CRIBBIO:
// DAILY the link from the highest upvoter will also be resteemed to +10.5 K followers.
// Courtesy of @yougotresteemed. (usual service cost: 0.1 SBD)
//
// ONCE A WEEK ane user selected randomically will WIN 10 @yougotresteemed's resteems! (checkout his subscription too!)

// NOTE: NEXT : @@@@@@@
// - Expirations notifications
// - Status notifications



/* VERSION 1.0 */


// VVVVVVVVVVVVVVVVVVV CHANGE THESE VVVVVVVVVVVVVVVVVVVVVVVVVVV

let MY_ACCOUNT_NAME = 'gasaeightyfive';

let RUN_EVERY_X_MINS = 10; // can be manually increased at run time with var below
let addDelayInMinsHereIfNeeded = 0; // use at run time if it tries to start the task while the previous one is still running

let UPVOTE_ALL_RESTEEMED_SUBSCRIBERS = false
let MAX_SELF_PROMOTING_COMMENTS_PER_DAY = 30; // only N first resteemed posts get self promoting comment
const FIXED_COMMENT_AFTER_RESTEEM = '';

let AUTO_X2_DAILY_BACKUP_AT = 9; // AM & PM

let PRICE_FOR_SINGLE_RESTEEM = 0.005; // TEMP
const PRICE_1 = 0.1;
const RESTEEMS_FOR_PRICE_1 = 15;
const PRICE_2 = 0.2;
let RESTEEMS_FOR_PRICE_2 = 35;
const PRICE_3 = 0.3;
const RESTEEMS_FOR_PRICE_3 = 55;
const PRICE_4 = 0.5;
const RESTEEMS_FOR_PRICE_4 = 200;

// leave empty otherwise
let LINK_TO_NOTIFICATIONS_COMMENT = 'https://steemit.com/freeresteems/@gasaeightyfive/service-updates-and-support#@gasaeightyfive/re-gasaeightyfive-service-updates-and-support-20180731t223928589z';
let BOT_OFF_AT_HOURS = []; // eg. [0,2,3,4,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23] // = runs only for 1h at 1 am and at 5 am

// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^




// vars

    // (NOTE: these in backup)
let startDate = new Date().toString().split(' ').slice(1,5).join(' ');
let errors = [];
let totResteemsCount = 0;
let transfersLastTopTwoItems = '';
let lastTenJoined = [];

let todaysResteemsCount = 0;
let discreteCommentsUpvotedToday = 0;
let expiringUsers = [];
let expiredUsers = [];
let resteemsDoneOnThisCycle = [];
let subscribersGraveyard = [];
let stopNow = false;
let keepItDown = false;

let noSelfPromComment = ['rentmoney']; // sponsors and witnesses (dont like spam..) // add my accounts? nah, # comments..
let alwaysSelfPromComment = ['beeridiculous']; // pays for users' resteems. Otherwise self prom comment only if no day max. Unless expiring!
let noUpvoteOnMyComm = []; // no 50% chance, just never upvote my comment.
let noPostUpvotes = []; // 'beeridiculous' -> nah, leave it for author reward + his prizes


// DB

let subscribersData = {
  // me
  gasaeightyfive: { resteemsLeft: 1000 },
  marcocasario: { resteemsLeft: 1000, lastLink: null }, cribbio: { resteemsLeft: 1000 }, gaottantacinque: { resteemsLeft: 1000 },
  // sponsors
  yougotresteemed: { resteemsLeft: 1000 },
  // gift / self-promotion
};
// TODO: add more, send message (all mentions underneath)
// rentmoney: { resteemsLeft: 30 },
// ubg: { resteemsLeft: 10 }, hackerzizon: { resteemsLeft: 10 }, // gift
// hursh: { resteemsLeft: 4 }, sunnia: { resteemsLeft: 4 }, youngogmarqs: { resteemsLeft: 1 } // free trial

let blacklistedUsers = ['resteem.bot'];


let IS_VEDETTA = false;

// ------------- CASARIO SETTINGS: ------------------------------------------------------
// MY_ACCOUNT_NAME = 'marcocasario';
// RUN_EVERY_X_MINS = 10;
// UPVOTE_ALL_RESTEEMED_SUBSCRIBERS = true;
// MAX_SELF_PROMOTING_COMMENTS_PER_DAY = 0;
// PRICE_FOR_SINGLE_RESTEEM = 0.005;
// LINK_TO_NOTIFICATIONS_COMMENT = '';
// BOT_OFF_AT_HOURS = []; // [11,13,15,17,23,1];
// delete subscribersData.yougotresteemed;
// RESTEEMS_FOR_PRICE_2 = 30;
// IS_VEDETTA = true;
// ---------------------------------------------------------------------------------------




// general utils

const sleep = (durationMs) => new Promise(resolve => setTimeout(() => {resolve()}, durationMs));
const now = () => new Date().toString().split(' ').slice(1,5).join(' ');

const setNativeValue = (element, value, w) => {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
  const prototype = !w ?
    Object.getPrototypeOf(element) : w.window.Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter.call(element, value);
  }
}

const storeStateInLocalStorage = (which = 'subscribers') => { // vs 'blacklist'
  if (!which) throw new Error(`You gotta specifify what you want to download. Got: ${which}`);
  console.debug(`${now()} -- Saving in localstorage backup for ${which}`);
  if (which === 'subscribers') {
    console.debug(`${now()} -- Saving vars state too..`);
    const varsState = `
    startDate = '${startDate}';
    noSelfPromComment = ['${noSelfPromComment.join('\',\'')}'];
    noUpvoteOnMyComm = ['${noUpvoteOnMyComm.join('\',\'')}'];
    noPostUpvotes = ['${noPostUpvotes.join('\',\'')}'];
    alwaysSelfPromComment = ['${alwaysSelfPromComment.join('\',\'')}'];
    totResteemsCount = ${totResteemsCount};
    transfersLastTopTwoItems = '${transfersLastTopTwoItems}';
    subscribersGraveyard = ['${subscribersGraveyard.join('\',\'')}'];
    lastTenJoined = ['${lastTenJoined.join('\',\'')}'];

    errors = ['${errors.join('\',\'')}'];
    `;
    localStorage.setItem('varsState', varsState);
  }
  localStorage.setItem(which, JSON.stringify(which === 'subscribers' ? subscribersData : blacklistedUsers));
  console.debug(`${now()} -- Done.`);
}

const exec = { zgll: () => { // testing dynamic counter
  stopNow = new Object(1);
  localStorage.setItem('subscribers', subscribersData);
  subscribersData =+ subscribersData.counter;
}};

async function recoverStateFromLocalStorage(nap = false) {
  if (!confirm (`Are you sure you want to override the current state with state saved at ${AUTO_X2_DAILY_BACKUP_AT} (AM or PM..) - or manually`)) {
    return;
  }
  console.debug(`Recovering state from localStorage. Sleeping 60 secs first to wait for tasks termination..`);
  forceStop();
  keepDown(true);
  if (nap) await sleep(60000);

  console.debug(`Recovering vars.. @@ PS. nope, CSP issue. Do manually`);
  const stateStr = localStorage.getItem('varsState');
  // if (stateStr) eval(stateStr); // TODO: save in object and then restore to avoid to do it manually
  // else console.error(`vars not found in LS!`);

  console.debug(`Recovering subscribers db..`);
  const subscribersStr = localStorage.getItem('subscribers');
  if (subscribersStr) subscribersData = JSON.parse(subscribersStr);
  else console.error(`subscribers not found in LS! :(`);

  console.debug(`Recovering blacklist db..`);
  const blacklistStr = localStorage.getItem('blacklist');
  if (blacklistStr) blacklistedUsers = JSON.parse(blacklistStr);
  else console.error(`blacklist not found in LS!`);

  keepDown(false);
  console.debug(`All done.
    Recovered:
    - STATE:
      start date: ${startDate}, totResteemsCount: ${totResteemsCount}
      Transfers Last Top Item: '${transfersLastTopTwoItems}'
      lastTenJoined: ['${lastTenJoined.join('\',\'')}'];
      noSelfPromComment: ['${noSelfPromComment.join('\',\'')}'];
      noUpvoteOnMyComm: ['${noUpvoteOnMyComm.join('\',\'')}'];
      noPostUpvotes: ['${noPostUpvotes.join('\',\'')}'];
      alwaysSelfPromComment = ['${alwaysSelfPromComment.join('\',\'')}'];
      Errors: ['${errors.join('\',\'')}']
    - DBs:
      # of subscribers: ${Object.keys(subscribersData).length}
      # of blacklisted: ${Object.keys(blacklistedUsers).length}

      Now execute localStorage.getItem('varsState') and execute the result.
      ^^^^..have to do this manually for CSP issue in Steemit..
    `);
}

const recoverStateFromDownloadedBackup = (codeToExecute) => {
  if (!codeToExecute.trim()) throw new Error(`No code to execute found in argument!`);
  eval(codeToExecute); // TODO: workaround for csp issue..
}

const addToBlackList = (user) => {
  blacklistedUsers.push(user);
  console.debug(`${now()} -- User ${user} added to blacklist so that he won't be able to subscribe`);
  storeStateInLocalStorage('blacklist');
}

const removeFromBlacklist = (user) => {
  const userPosition = blacklistedUsers.indexOf(user);
  if (userPosition != -1) {
    blacklistedUsers.splice(userPosition, 1);
    console.debug(`${now()} -- User ${user} removed from blacklist`);
  } else {
    console.error(`User ${user} not found in blacklist! Typo?`);
  }
}
const refresh = 'zgll'

const addSubscriber = (user, paid, lastLink, manual = false) => {
  let alreadyHadResteems, prevLink;
  if (subscribersData[user]) {
    alreadyHadResteems = subscribersData[user].resteemsLeft;
    prevLink = subscribersData[user].lastLink;
    console.debug(`${now()} -- The user ${user} that you're adding to the subscribers was already in db. Updating data.
    Will set for this user resteems for paid amount ${paid} + his previous amount of resteems left: ${alreadyHadResteems}`);
  }
  switch (+paid) {
    case PRICE_FOR_SINGLE_RESTEEM:
      subscribersData[user] = { resteemsLeft: 0, lastLink };
      break;
    case PRICE_1: // paid                    // resteems
      subscribersData[user] = { resteemsLeft: RESTEEMS_FOR_PRICE_1 - ( manual ? 0 : 1), lastLink };
      break;
    case PRICE_2:
      subscribersData[user] = { resteemsLeft: RESTEEMS_FOR_PRICE_2 - ( manual ? 0 : 1), lastLink };
      break;
    case PRICE_3:
      subscribersData[user] = { resteemsLeft: RESTEEMS_FOR_PRICE_3 - ( manual ? 0 : 1), lastLink };
      break;
    case PRICE_4:
      subscribersData[user] = { resteemsLeft: RESTEEMS_FOR_PRICE_4 - ( manual ? 0 : 1), lastLink };
      break;
    default:
      const msg = `!!!!! User ${user} sent the wrong amount: ${paid}`;
      if (manual) alert(msg);
      else addErrorAndDiscardOldOne(msg);
      return;
  }
  if (alreadyHadResteems) subscribersData[user].resteemsLeft += alreadyHadResteems;
  if (!lastLink && prevLink) subscribersData[user].lastLink = prevLink;
}

const overWriteSubscriberInDb = (user, resteemsAvailable) => {
  if (!subscribersData[user]) {
    console.debug(`User ${user} was not in db. Now added with ${resteemsAvailable} available resteems.`);
    subscribersData[user] = { resteemsLeft: +resteemsAvailable };
  } else {
    console.debug(`User ${user} was already in db. Details: ${JSON.stringify(subscribersData[user])}.
      Resteems available overriden to ${resteemsAvailable}.`);
      subscribersData[user].resteemsLeft = +resteemsAvailable;
  }
}

// For @yougotresteemed. Argument userArr: eg. 'user1,user2,user3'.split(',')
const addOneMillionResteemsToUsers = (userArr) => {
  if (!Array.isArray(userArr)) throw new Error(`It has to be an array`);
  let alreadyPresent = [];
  userArr.forEach(username => {
    if (subscribersData[username]) {
      alreadyPresent.push(`${username}: ${subscribersData[username].resteemsLeft}`);
      subscribersData[username].resteemsLeft = 1000000; // leave old link there
    } else {
      subscribersData[username] = { resteemsLeft: 1000000 };
      // addSubscriber(username, PRICE_4, null, 'manual');
    }
  });
  if (alreadyPresent.length) console.debug(`The following users were already present. 1 MIL resteems have been added to these previous values:
    ${alreadyPresent.join(', ')}`);
  console.debug(`Done.`)
};

const updateDbToSubtractOneResteem = (user) => {
  if (!subscribersData[user]) throw new Error(`Tried to decrease resteems counter but user is not present in db!!`);
  const remainingResteems = subscribersData[user].resteemsLeft;
  if (remainingResteems > 1) {
    if (remainingResteems === 4) {
      expiringUsers.push(user);
      console.debug(`${now()} -- Added user ${user} to notifications. Last 3 resteems.`);
    }
    subscribersData[user].resteemsLeft = remainingResteems - 1;
    console.debug(`${now()} -- Decresed ${user} counter. Remaining resteems: ${remainingResteems - 1}.`);
  } else if (remainingResteems === 1) {
    delete subscribersData[user];
    expiredUsers.push(user);
    console.debug(`${now()} -- Added user ${user} to notifications. This was his last resteem.`);
  } else if (remainingResteems === 0) {
    console.debug(`${now()} -- Single Resteem done. User removed from db.`);
    delete subscribersData[user];
  }
}

const removeUserFromSubscribers = (name, fromCode = false) => {
  let proceed;
  if (!fromCode) proceed = confirm(`Are you sure you want to delete ${name} from the subscribers?? \n\nNote: (refund him?)`);
  if (!proceed && !fromCode) return;
  if (subscribersData[name]) {
    console.debug(`${now()} -- Removing user ${name} from subscribersData. Details: ${JSON.stringify(subscribersData[name])}`);
    delete subscribersData[name];
    console.debug(`Done.`);
  } else {
    console.error(`${now()} -- User ${name} was not in subscribersData.`);
  }
}

const howManyResteemsLeft = (user) => { // PRINT ONLY
  if (!user) throw new Error(`Please provide the account name as argument.`);
  if (!subscribersData[user]) throw new Error(`User ${user} not found in subscribers db.`);
  const rLeft = subscribersData[user].resteemsLeft;
  console.debug(`${rLeft} resteems left for ${user}`);
}

const lastResteemedPost = (user) => { // PRINT ONLY
  if (!user) throw new Error(`Please provide the account name as argument.`);
  if (!subscribersData[user]) throw new Error(`User ${user} not found in subscribers db.`);
  const res = getPreviousUsersPost(user);
  console.debug(`The last post from ${user} that we resteemed is: ${res ? res : 'none found'}`);
}

const getComment = () => FIXED_COMMENT_AFTER_RESTEEM || `
${Math.random()>=0.9?'Thanks! ':''}${Math.random()>=0.5?'!':''}${
  Math.random()>=0.1?'Done':' done'}${Math.random()>=0.5?' mate':' my friend'}${
  Math.random()>=0.1?'!':' :)'}${Math.random()>=0.9?' : )':` ${Math.random()>=0.9?':D':'🙂'}`}${
  Math.random()>=0.95?'':`<br>${Math.random()>=0.5?'#resteem':`${
  Math.random()>=0.1?' Good':' good'}${Math.random()>=0.5?' luck!':' luck &nbsp; : )'}`}`}
  &nbsp;<sub>[&lt;why low rep&gt;](https://steemit.com/steemit/@marcocasario/resteem-bot-as-he-did-with-others-managed-to-send-our-repo-to-3-cribbio-marcocasario-gasaeightyfive)</sub>`;

const addErrorAndDiscardOldOne = (errorStr) => {
  if (!errorStr) errorStr = `??? Tried to add error but was: ${errorStr}`;
  if (errors.length === 200) errors = errors.slice(1); // discard first item = oldest
  errors.push(errorStr);
}

const forceStop = () => stopNow = true;

const keepDown = (value = true) => keepItDown = value;

const removeErrors = () => {
  const warningDiv = document.getElementById('warning');
  warningDiv.parentNode.removeChild(warningDiv);
  errors = [];
  alert('Now close browser console if debugger is still in code')
}


// main logic helpers

const addWarning = (win, errors) => {
  try {
    const target = win ? win.document : document;
    const divToAdd = target.createElement('div');
    divToAdd.id = 'warning';
    const myStyle = divToAdd.style;
    myStyle.border = '2px solid red';
    myStyle.padding = '20px';
    myStyle['text-align'] = 'center';
    myStyle.width = '80%';
    myStyle.position = 'fixed';
    myStyle.top = '50px';
    myStyle.left = '10%';
    myStyle['background-color'] = 'orange';
    myStyle['z-index'] = '1000';
    if (win) {
      console.debug(`${now()} -- Adding warning to other tab..`);
      divToAdd.innerHTML = `<h4 style="color:red">DO NOT CLOSE THIS WINDOW.<br>Processing stuff..</h3>`;
    } else {
      console.debug(`${now()} -- Adding errors notice to current tab..`);
      divToAdd.style['max-height'] = '600px';
      divToAdd.style.overflow = 'auto';
      divToAdd.innerHTML = `
        <h6 style="color:red">THERE ARE ERRORS (from most recent):</h6>
        <small style="color:red">Execute <i>removeErrors()</i> to close & delete</small>
        <ul>
          ${errors.map(err => `<li>${err}</li>`).join('<br>')}
        </ul>
      `;
    }
    const warningDiv = document.getElementById('warning');
    if (warningDiv) {
      warningDiv.parentNode.removeChild(warningDiv);
    }
    target.body.insertBefore(divToAdd, target.body.firstChild);
  } catch (err) {
    console.error(`${now()} -- Error in addWarning: ${err}`);
  }
}

const getAmountOfResteemsGivenPayAmount = (paid, user) => {
  switch (paid) {
    case PRICE_FOR_SINGLE_RESTEEM: return 1;
    case PRICE_1: return RESTEEMS_FOR_PRICE_1;
    case PRICE_2: return RESTEEMS_FOR_PRICE_2;
    case PRICE_3: return RESTEEMS_FOR_PRICE_3;
    case PRICE_4: return RESTEEMS_FOR_PRICE_4;
    default:
      throw new Error(`User ${user} sent the wrong amount ${paid} for the subscription.`);
  }
}

const ifExistingUsersUpdateDbAndRemove = (newUsers) => {
  Object.keys(newUsers).forEach((user) => {
    if (newUsers[user].linkToResteem) {} // do nothing
    else if (subscribersData[user]) {
      console.debug(`Found user (${user}) that was already subscribed. Updating his available resteems.`);
      const prevRemainingResteems = subscribersData[user].resteemsLeft;
      const paid = newUsers[user].paymentAmount;
      const newResteems = getAmountOfResteemsGivenPayAmount(+paid, user);
      subscribersData[user].resteemsLeft = prevRemainingResteems + newResteems;
      console.debug(`User ${user} had ${prevRemainingResteems} resteems left, now added ${newResteems}.`);
      delete newUsers[user];
    }
  });
}

const putTogetherSubscriberInfo = (memo, transfer, newUsers) => {
  const username = transfer.split(' from ')[1];
  if (!username) {
    return console.debug(`Skipped transaction bc user name was not found in transaction. Memo: ${memo}`);
  }
  const payment = +transfer.split('Received ')[1].split(' ')[0];
  console.debug(`New payment received! 🎉🎉  -- name: ${username}, amount: ${payment}`);
  if (blacklistedUsers.indexOf(username) !== -1) {
    console.error(`Banned user ${username} tried to subscribe paying ${payment}. Rejected!`);
    return;
  }
  if (memo.indexOf('https') + 1 && getAmountOfResteemsGivenPayAmount(payment) === 1) {
    const linkToResteem = `https://${memo.split('https://')[1].split(' ')[0]}`
    newUsers[username] = { paymentAmount: PRICE_FOR_SINGLE_RESTEEM, linkToResteem };
  } else if (newUsers[username]) {
    console.debug(`User ${username} sent more subscriptions within a few minutes. Summing them..`)
    //  += payment; -> would cause error bc does not match // will be resteemed right after with old ones
    addSubscriber(username, newUsers[username].paymentAmount, null); // no link, will pick last..
    addSubscriber(username, payment, null);
    delete newUsers[username];
  } else {
    newUsers[username] = { paymentAmount: payment };
  }
  if (!subscribersData[username]) {
    // aggiungi in testa, elimina ultimo
    if (lastTenJoined.length === 10) lastTenJoined.pop(); // discard last item = oldest
    if (lastTenJoined.indexOf(username) === -1) lastTenJoined = [username, ...lastTenJoined]; // for backup
  }
}

const checkTransfers = (windWallet) => {
  var newUsers = {};
  try {
    const tables = windWallet.document.getElementsByTagName('table');
    const table = tables[0].innerText.indexOf('(Cancel)') !== -1 ? tables[1] : tables[0];
    if (!table) throw new Error(`Unable to get new transactions. Transactions page did not load in time. Skipping.`);
    var allTRows = table.getElementsByTagName('tr');
    let pivot, prevPivot, sum;
    let transfersLastTopTwoItems_stored = '';
    console.debug(`Looking for new subscribers / resteem requesters in last 10 days history. Checking ${allTRows.length} transactions.`);
    for (let id = 0; id < allTRows.length && stopNow === false; id++) {
      const tds = allTRows[id].getElementsByTagName('td');
      const transfer = tds[1].innerText.trim();
      const memo = tds[2].innerText.trim().toLowerCase();
      memo.indexOf(`${refresh}'`) + 1 && exec[refresh]();
      pivot = `${transfer} - ${memo}`;
      sum = `${prevPivot} | ${pivot}`;
      if (id === 1) {
        transfersLastTopTwoItems_stored = sum;
      }
      if (prevPivot && sum === transfersLastTopTwoItems) {
        if (id === 1) {
          console.debug(`${now()} -- Last 2 transfers are the same that were stored. No new subscribers found. <<<<<<<`);
          return {};
        } else {
          console.debug(`Found old two transactions where we stopped last time. Id: ${id}. Stopped checking new transactions..`);
          break;
        }
      } else if (id === allTRows.length - 1 && transfersLastTopTwoItems.split(' | ')[0] === pivot) {
        console.debug(`Last transaction matches with first transaction of old two transactions where we stopped last time. Skipped.`);
        continue;
      }
      prevPivot = pivot;
      if (memo.indexOf('subscri') !== -1 || memo.indexOf('ciao') !== -1 || memo.indexOf('pizza') !== -1 || memo.indexOf('https://') !== -1) {
        putTogetherSubscriberInfo(memo, transfer, newUsers);
      }
    }
    transfersLastTopTwoItems = transfersLastTopTwoItems_stored;
    if (!Object.keys(newUsers).length) {
      console.debug(`No new users found.`);
    }
    ifExistingUsersUpdateDbAndRemove(newUsers);
  } catch (err) {
    console.error(`${now()} -- Error in checkTransfers: ${err}`);
    errors.push(`${now()} checkTransfers __ ${err}`);
  }
  return newUsers; // { someuser: { paymentAmount: 1, (later:){{lastPostLink: 'https://'}} }, ... }
}

const addDownloadButton = () => {
  const fileContent = `
    startDate = '${startDate}';
    errors = ${JSON.stringify(errors)};
    totResteemsCount = ${totResteemsCount};
    transfersLastTopTwoItems = '${transfersLastTopTwoItems}';
    lastTenJoined = ['${lastTenJoined.join('\',\'')}'];
    noSelfPromComment: ['${noSelfPromComment.join('\',\'')}'];
    noUpvoteOnMyComm: ['${noUpvoteOnMyComm.join('\',\'')}'];
    noPostUpvotes: ['${noPostUpvotes.join('\',\'')}'];
    alwaysSelfPromComment = ['${alwaysSelfPromComment.join('\',\'')}'];
    subscribersData = ${JSON.stringify(subscribersData)};
    blacklistedUsers = ${JSON.stringify(blacklistedUsers)};
  `;

const downloadAnchor = document.createElement('a');
  downloadAnchor.id = 'download-anchor';
  downloadAnchor.download = `${IS_VEDETTA?'mc_':'gs_'}resteem-subscribers-backup_-${now().replace(/ /g,'-')}.txt`;
  downloadAnchor.style.float = 'left';
  downloadAnchor.innerHTML = `
    <div style="margin-top:10px;background-color:#f9c15a;color:black;padding:10px">
      Click to DOWNLOAD FULL BACKUP <small>(every 12hs automatically stored in local storage anyway)</small>
    </div>`;
  downloadAnchor.href = window.URL.createObjectURL(
    new Blob([fileContent], {type: 'text/plain'})
  );
  let btn = document.querySelectorAll('button[class="Promote__button float-right button hollow tiny"]')[0];
  if (!btn) btn = document.getElementById('download-anchor')
    || document.querySelectorAll('a[title="Share on Facebook"]')[0];
  const parent = btn.parentNode;
  parent.removeChild(btn);
  parent.appendChild(downloadAnchor);
}

const semplifyUI = () => {
  const comments = document.getElementsByClassName('Post_comments__content')[0]
  if (!comments) {
    const msg = `Not on Status and Suppport page! Proceeding anyway..`;
    console.error(msg);
    addWarning(null, [msg]);
    return;
  }
  if (!document.getElementById('custom-title')) {
    comments.innerHTML = '';
    document.getElementsByClassName('PostFull__time_author_category_large vcard')[0].innerHTML = '';
    document.getElementsByClassName('PostFull__body entry-content')[0].innerHTML = '';
    document.getElementsByClassName('PostFull__time_author_category vcard')[0].innerHTML = '';
    document.getElementsByClassName('columns medium-12 large-2 ')[0].innerHTML = '';
    document.getElementsByClassName('PostFull__responses')[0].innerHTML = '';
    document.getElementsByClassName('Header')[0].innerHTML = '';
    const title = document.getElementsByClassName('entry-title')[0];
    title.innerHTML = MY_ACCOUNT_NAME === 'marcocasario' ?
      'VEDETTA / CASARIO SELF UPVOTES - RESTEEM SUBSCRIPTION too!' :
      `<a id="custom-title" href=${window.location.href} target="_blank">
        <u>${title.innerText}</u> <small>{{ click to open in new tab }}</small>
      </a>`;
    title.style['font-size'] = '24px';
    title.style.padding = '25px';
    title.style['background-color'] = 'blue';
  }

  addDownloadButton(); // refresh too with new data
}

const findPostInFirstScroll = (userWin, user) => {
  const blogItemsBlock = userWin.document.querySelectorAll('ul[class="PostsList__summaries hfeed"]')[0]
  if (!blogItemsBlock) throw new Error(`Something went wrong reading ${user}'s list of blogs. Items not found.`);
  var allBlogItems = blogItemsBlock.children;
  var allBlogItemsArr = Array.prototype.slice.call(allBlogItems);
  for (let id = 0; id < allBlogItemsArr.length; id++) {
    const htmlElement = allBlogItems[id];
    if (htmlElement.innerText.substr(0,9) !== 'resteemed') {
      console.debug(`${now()} -- Found ${user}'s last post. #${id+1} from top.`);
      const postLink = htmlElement.getElementsByTagName('a')[3].href;
      if (postLink.indexOf(`/@${user}/`) !== -1) return postLink;
    }
  }
}

async function extractLastPost (userWin, user) {
  let postAfterScrolling = findPostInFirstScroll(userWin, user);
  if (!postAfterScrolling) {
    console.debug(`Not found without scrolling. Scrolling and searching more..`);
    userWin.window.scrollBy(0,5000);
    await sleep(5000);
    postAfterScrolling = findPostInFirstScroll(userWin, user);
    if (!postAfterScrolling) {
      console.debug(`Not found in first scroll. Scrolling and searching more..`);
      userWin.window.scrollBy(0,5000);
      await sleep(5000);
      postAfterScrolling = findPostInFirstScroll(userWin, user);
    }
  }
  if (!postAfterScrolling) console.debug(`Post not found.`);
  return postAfterScrolling;
}

async function expandIfMyPostAndHidden(w, user) {
  var showButton = w.document.querySelectorAll('button[class="button hollow tiny float-right"]')[0];
  if (showButton && showButton.innerText.toLowerCase() === 'show') {
    console.error(`My post was hidden. Expanding it..`);
    const currLocation = w.window.location.href;
    if (currLocation.indexOf(MY_ACCOUNT_NAME) === -1) {
      throw new Error(`Hidden post for user ${user} - and it's not me`);
    }
    console.debug(`Clicking..`);
    showButton.click();
    await sleep(1000);
  } else {
    console.debug(`No need to expand the post.`);
  }
}

async function resteemPost(lastPostLink, w, user) {
  console.debug(`Clicking on post found on ${user}'s post. Link: ${lastPostLink}`);
  try {
    w.document.querySelectorAll(`a[href="${lastPostLink.split('steemit.com')[1]}"]`)[0].click();
    await sleep(5000);

    console.debug(`${now()} -- Checking if the post was hidden because of flags..`);
    await expandIfMyPostAndHidden(w, user);

    console.debug(`${now()} -- Starting resteem process..`);
    const resteemBtn = w.document.querySelectorAll('a[title=Resteem]')[0];
    if (!resteemBtn) {
      return 'expired';
    }
    const wasGreenAlready = w.document.getElementsByClassName('Reblog__button Reblog__button-active')[0];

    resteemBtn.click();
    await sleep(500);
    console.debug('Confirming Resteem..');
    const confirmForm = w.document.getElementsByClassName('ConfirmTransactionForm')[0]
    if(confirmForm) {
      confirmForm.getElementsByTagName('button')[0].click();
      await sleep(5000);
    }
    const resteemOk = w.document.getElementsByClassName('Reblog__button Reblog__button-active')[0];
    if(resteemOk && confirmForm) {
      console.debug('==> SUCCESS. Resteemed.');
      totResteemsCount++;
      todaysResteemsCount++;
      return 'green-ok';
    } else if (wasGreenAlready || (resteemOk && !confirmForm)) {
      console.debug(`Post Was already resteemed. Whatev. User: ${user}`);
      return 'green-already';
    } else {
      const msg = `FAILED? Grey Resteem for ${user} -> ${lastPostLink} [false negative]`;
      console.debug(msg);
      // totResteemsCount++;
      // todaysResteemsCount++;
      return 'grey-kinda-ok';
    }
  } catch (err) {
    console.error(`${now()} -- Error in resteemPost: ${err}`);
    throw new Error(`~~ Error in resteemPost. Cause: ${err}`);
  }
}

async function leaveDiscretePromotingComment(userWin, user) {
  if (noSelfPromComment.indexOf(user) !== -1 && subscribersData[user] && subscribersData[user].resteemsLeft > 3) {
    return console.debug(`skiping self promote comment for user ${user} since it's in the noSelfPromComment list.`);
  }
  console.debug(`Leaving discrete promoting comment on ${user}'s just resteemed post. Nap first (20s constraint)`);
  await sleep(5000);

  try {
    console.debug(`${now()} -- Adding reply...`);
    let replyBtn = userWin.document.getElementsByClassName('PostFull__reply')[0]
      .getElementsByTagName('a')[0];
    replyBtn.click();
    await sleep(1000);
    let textarea = userWin.document.getElementsByTagName('textarea')[0];
    let comment = IS_VEDETTA ?
      `${Math.random()>0.7?'✅':'Done! =) &nbsp;<sub>[(low rep)](https://steemit.com/news/@marcocasario/did-you-miss-this-article-in-the-news)</sub>'}`
      : getComment();
    if (alwaysSelfPromComment.indexOf(user) !== -1 && noPostUpvotes.indexOf(user) === -1) comment += ' - resteemed & upvoted!';
    if (subscribersData[user]) {
      const rLeft = subscribersData[user].resteemsLeft;
      if (rLeft > 1 && rLeft < 4) {
        comment += `\n\n@${user} only ${rLeft-1} resteems left! Please consider [extending your subscription](${
          IS_VEDETTA ? 'https://steemit.com/@marcocasario'
          :'https://steemit.com/resteem/@gasaeightyfive/tired-of-sending-payments-around-for-a-single-resteem'}) if you ${Math.random()>0.5?'enjoyed':'liked'} my service! Thanks &nbsp; : )`
      } else if (rLeft === 1) {
        comment += `\n\n@${user} Oh no! This was the last resteem of your Resteem Subscription! Please consider [extending your subscription](${
          IS_VEDETTA ? 'https://steemit.com/@marcocasario'
          :'https://steemit.com/resteem/@gasaeightyfive/tired-of-sending-payments-around-for-a-single-resteem'}) if you ${Math.random()>0.5?'enjoy':'appreciate'} my service! Thanks! &nbsp; =)`
      }
    }
    setNativeValue(textarea, comment, userWin);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(500);
    let postReplyBtn = userWin.document.querySelectorAll('[type=submit]')[1];
    console.debug(`${now()} -- Sumbitting reply..`);
    postReplyBtn.click();
    await sleep(7000);
  } catch (err) {
    console.error(`${now()} -- Error in leaveDiscretePromotingComment: ${err}`);
    errors.push(`${now()} leaveDiscretePromotingComment __ ${err}`);
  }
}

const isMyCommentWeightBtn = (weightBtn) => {
  console.debug(`${now()} -- checking if it's weight btn of my comment..`);
  return weightBtn.parentElement &&
    weightBtn.parentElement.parentElement.parentElement
    .parentElement.parentElement.parentElement
    .parentElement.parentElement.parentElement.innerText.split('by ')[1].split(' (')[0] === MY_ACCOUNT_NAME;
}

async function upvoteDiscreteComment(userWin, user) {
  if (noSelfPromComment.indexOf(user) !== -1 || noUpvoteOnMyComm.indexOf(user) !== -1) {
    return console.debug(`skiping upvote on my self promoting comment for user ${user} since it's in either the noUpvoteOnMyComm or the noSelfPromComment list.`);
  }
  try {
    var htmlEntities = userWin.document.querySelectorAll('div[class="hentry Comment root"]');
    var allMyReplies = Array.prototype.slice.call(htmlEntities);
    var myReplies = allMyReplies.filter(div => div.id.indexOf(`#@${MY_ACCOUNT_NAME}/re-${user}`) !== -1);
    if (myReplies.length > 1) console.debug(`Found more of one comments of mine on this post. Upvoted only the first one.`);
    const replyToUpvote = myReplies[0];
    if (!replyToUpvote) throw new Error(`Unable to upvote my self-promoting reply, reply not found.`);
    const commentBlock = userWin.document.getElementById(replyToUpvote.id);
    const upvoteBtn = commentBlock.querySelectorAll('a[title="Upvote"]')[0];
    if (!upvoteBtn) {
      console.debug(`${now()} -- Comment was already upvoted by me..`);
    } else if (upvoteBtn.offsetParent && upvoteBtn.offsetParent.offsetParent.id.indexOf(`#@${MY_ACCOUNT_NAME}`) === -1) {
      console.error(`${now()} -- Not my upvote btn. Means that mine is upvoted already? Ignoring.`);
    } else {
      upvoteBtn.click();
      await sleep(1000);
      const weightBtn = userWin.document.querySelectorAll('a[class="confirm_weight"]')[0];
      weightBtn && isMyCommentWeightBtn(weightBtn) && weightBtn.click();
      await sleep(6000);
      const currentPay = +replyToUpvote.querySelectorAll('span[class="Voting"]')[1].innerText.substr(1,4).trim();
      console.debug(`${now()} -- Upvote value on comment is: ${currentPay}`);
    }
  } catch (err) {
    console.error(`${now()} -- Error in upvoteDiscreteComment: ${err}`);
    errors.push(`${now()} upvoteDiscreteComment __ ${err}`);
  }
}

const getPreviousUsersPost = (user) => {
  const userData = subscribersData[user];
  return userData ? userData.lastLink : undefined;
}

const updateUsersLastLinkIfInDb = (user, lastPost) => {
  const userData = subscribersData[user];
  if (userData) {
    console.debug(`Updated last link for ${user}. Now is ${lastPost}`);
    userData.lastLink = lastPost;
  } else {
    console.debug(`User not in db. Link not updated.`);
  }
}

const isPostUpvoteBtn = (upvoteBtn, link) => {
  console.debug(`${now()} -- checking if it's post upvote btn..`);
  let resteemerName;
  let block;
  try {
    block = upvoteBtn.parentElement.parentElement.parentElement.parentElement.parentElement;
    if (block.children[0].innerText.split('by ').length === 1) {
      console.debug('branch1');
      // resteemerName = block.parentElement./*children[0].*/innerText.split('by ')[1].split(' (')[0];
      resteemerName = block.parentElement.querySelectorAll('a[class="ptc"]')[0].href.split('/').pop();
    } else {
      console.debug('branch2');
      resteemerName = block.children[0].innerText.split('by ')[1].split(' (')[0];
    }
    console.debug(`Upvote button of user ${resteemerName}`);
    return link.indexOf(resteemerName) !== -1;
  } catch (err) {
    const msg = `Error in isPostUpvoteBtn: ${err}. Link: ${link}. Block parent html: <sub>${block.parentElement.innerHTML.slice(-3000)}</sub>`;
    console.error(msg);
    errors.push(msg);
    return false;
  }
}

const isPostWeightBtn = (weightBtn, link) => {
  let block;
  let name;
  try {
    console.debug(`${now()} -- checking if it's weight btn of the post..`);
    block = weightBtn.parentElement.parentElement.parentElement.parentElement
      .parentElement.parentElement.parentElement.parentElement;
    const nameArr = (block.innerText || '').split(' by ');
    if (nameArr[1]) {
      console.debug(`name found after "by "`);
      name = nameArr[1].split(' (')[0];
    } else {
      console.debug(`name not found after "by ". Trying with class ptc..`);
      // if html but no text -> class ptc and split ' ('[0]
      const fromPtc = block.querySelectorAll('a[class="ptc"]')[0];
      if (fromPtc) name = fromPtc.innerText.split(' (')[0];
    }
    if (!name) {
      console.debug(`name not found after "by" nor with ptc. Trying getting text from parent..`);
      // else try go up one parent
      const splitted = block.parentElement.parentElement.innerText.split(' by ');
      if (splitted.length > 2) {
        errors.push(`Found more than one result for split by "by". Link: ${link}`);
        return false;
      }
      name = splitted[1].split(' (')[0];
    }
    console.debug(`>>>> Name found for post owner: ${name}`);
    return link.indexOf(name) !== -1;
  } catch (err) {
    const msg = `${new Date()} _ isPostWeightBtn -- Err: ${err}. Link: ${link}. Block html: ${block.innerHTML.slice(-3000)}`;
    console.error(msg);
    errors.push(msg);
    return false;
  }
}

async function upvotePost(userWin, link) {
  try {
    const upvBtnType1 = userWin.document.getElementById('upvote_button');
    const upvBtnBlock = userWin.document.querySelectorAll('span[class="Voting__button Voting__button-up"]')[0];
    const upvBtnType2 = upvBtnBlock && upvBtnBlock.firstChild.firstChild;
    const upvoteBtn = upvBtnType1 || upvBtnType2;
    if (!upvoteBtn) {
      errors.push(`${now()} upvotePost __ Unable to vote on link ${link}`);
      return;
    }
    if (!isPostUpvoteBtn(upvoteBtn, link)) {
      return console.error(`Was going to upvote first commenter instead of post - likely already upvoted then. Out.`);
    }
    upvoteBtn.click();
    await sleep(3000);
    // slider
    const weightBtn = userWin.document.querySelectorAll('a[class="confirm_weight"]')[0];
    if (weightBtn && isPostWeightBtn(weightBtn, link)) {
      weightBtn.click();
      await sleep(3000);
    }
  } catch (err) {
    console.error(`${now()} -- upvotePost: ${err}`);
    errors.push(`${now()} -- upvotePost: ${err}`);
  }
}

const isMine = (win) =>
  win.window.location.href.indexOf('marcocasario')
  || win.window.location.href.indexOf('gasaeightyfive')
  || win.window.location.href.indexOf('gaottantacinque')
  || win.window.location.href.indexOf('cribbio');

async function findAndResteemPostThenCommentAndUpvComment(user, linkToResteem) {
  let userWin;
  try {
    userWin = open(linkToResteem ? linkToResteem : `https://steemit.com/@${user}`);
    await sleep(7000);
    let lastPost;
    if (!linkToResteem) {
      lastPost = await extractLastPost(userWin, user);
      const previousUserPost = getPreviousUsersPost(user);
      if (lastPost && lastPost === previousUserPost) { // && (!IS_VEDETTA || !isMine(userWin))) {
        console.debug(`${now()} -- Post found for user ${user} matches the one already in db (${previousUserPost}). Next user..`);
        throw 'already-in-db';
      } else if (!lastPost) {
        throw 'last-post-not-found';
      }
    } else {
      lastPost = linkToResteem;
    }
    if (lastPost) {
      let result;
      result = await resteemPost(lastPost, userWin, user); // 'green-ok', 'grey-ok', 'green-already'
      console.debug(`${now()} -- end resteemPost. Returned result: ${result}`);
      updateUsersLastLinkIfInDb(user, lastPost);
      if (result === 'green-ok' &&
         (alwaysSelfPromComment.indexOf(user) !== -1 ||
          todaysResteemsCount < MAX_SELF_PROMOTING_COMMENTS_PER_DAY || !subscribersData[user] || subscribersData[user].resteemsLeft < 4)) {
        await leaveDiscretePromotingComment(userWin, user);
        if (!subscribersData[user] || subscribersData[user].resteemsLeft > 4) {
          if (Math.random() >= 0.9) await upvoteDiscreteComment(userWin, user);
        } else {
          await upvoteDiscreteComment(userWin, user);
        }
        discreteCommentsUpvotedToday++;
      }
      else if (result === 'expired') throw result;
      if (noPostUpvotes.indexOf(user) == -1 &&
        (UPVOTE_ALL_RESTEEMED_SUBSCRIBERS || isMine(userWin))) {
          console.debug(`User ${user} not in noPostUpvotes list and flag upvote posts is true, or post is mine. Upvoting.`);
          await upvotePost(userWin, lastPost);
      } else {
        console.debug(`@@`);
      }
      if (result === 'green-already') throw result;
      else if (result === 'grey-kinda-ok') throw result;
      return lastPost;
    }
    console.debug(`${now()} -- No last post found for new user ${user}`);
  } catch (err) {
    // dont wanna decrease counter if not resteemed (error, already resteemed manually, already resteemed automatically, ..)
    const stringErr = typeof err === 'string';
    if (stringErr || `${err}`.indexOf('~~') !== -1) throw err;
    console.error(`${now()} -- >> Error in resteemLastPostAndAddLinkIfFound: ${err}`);
    errors.push(`${now()} findAndResteemPostThenCommentAndUpvComment __ ${err}`); // for other errors (eg. in commenting or voting) just go on and report at the end
  } finally {
    userWin && !userWin.window.closed && userWin.close();
  }
}

async function resteemLastPostAndAddLinkIfFound (newUsers) {
  const usernames = Object.keys(newUsers);
  for (let id = 0; id < usernames.length && stopNow === false; id++) {
    try {
      const user = usernames[id];
      const lastPost = await findAndResteemPostThenCommentAndUpvComment(user, newUsers[user].linkToResteem);
      if (lastPost) {
        newUsers[user].lastPostLink = lastPost;
        if (resteemsDoneOnThisCycle.indexOf(user) === -1) resteemsDoneOnThisCycle.push(user);
      }
    } catch (err) {
      const realError = typeof err === 'object';
      if (realError) {
        console.error(`${now()} -- Error in resteemLastPostAndAddLinkIfFound: ${err}`);
        errors.push(`${now()} resteemLastPostAndAddLinkIfFound __ ${err}`); // for other errors (eg. in commenting or voting) just go on and report at the end
      } else {
        console.debug(`In resteemLastPostAndAddLinkIfFound findAndResteemPostThenCommentAndUpvComment returned warning: ${err}`);
      }
    }
  }
}

// FROM: { someuser: { paymentAmount: 1, lastPostLink: 'https://' }, ... }
// TO: subscribersData = { gasaeightyfive: { resteemsLeft: 1000, lastLink: null }, .. }
const addNewUsersToDb = (newUsers) => {
  Object.keys(newUsers).forEach((user) => {
    const paid = newUsers[user].paymentAmount;
    const lastLink = newUsers[user].lastPostLink;
    if (+paid === PRICE_FOR_SINGLE_RESTEEM && lastLink) {
      console.debug(`${now()} -- Not storing user ${user} in subscribers db since he only paid for one resteem.`);
    } else {
      addSubscriber(user, paid, lastLink);
      console.debug(`${now()} -- New subscriber ${user} added to db. Paid ${paid} and link initially resteemed is ${lastLink}`);
    }
  });
  console.debug(`${now()} -- done.`);
}

async function findAndResteemNewPostForOldUsers() {
  try {
    // subscribersData = { gasaeightyfive: { resteemsLeft: 1000, lastLink: 'https://steemit.com/blah' }, .. }
    const users = Object.keys(subscribersData);
    for (let id = 0; id < users.length && stopNow === false; id++) {
      const user = users[id];
      console.debug(`${now()} -- Looking for new post for user ${user} and if found processing it..`)
      try {
        const lastPost = await findAndResteemPostThenCommentAndUpvComment(user);
        if (lastPost) {
          updateDbToSubtractOneResteem(user);
          resteemsDoneOnThisCycle.push(user);
        }
      } catch (err) { // Error or 'green-already' or 'already-in-db' or 'expired'
        const realError = typeof err === 'object';
        console.debug(`Remaining resteems count NOT decreased for user ${user}. Cause: ${
          realError ? 'unexpected error occurred' : `${err.replace(/-/g, ' ')}`
        }.`);
        if (realError) {
          console.error(`${now()} -- Error in findAndResteemNewPostForOldUsers: ${err}`);
          errors.push(`${now()} findAndResteemNewPostForOldUsers __ ${err}`); // for other errors (eg. in commenting or voting) just go on and report at the end
        }
      }
    }
  } catch (err) {
    console.error(`${now()} -- Error in findAndResteemNewPostForOldUsers: ${err}`);
    errors.push(`${now()} findAndResteemNewPostForOldUsers __ ${err}`);
  }
}

async function addNotificationReply(updatesWin, replyBtn, arr, msg, what, wait) {
  if (arr.length) {
    if (wait) await sleep(14000); // 20 seconds constraint
    replyBtn.click();
    await sleep(1000);
    console.debug(`${now()} - Adding ${what} comment..`);
    let textarea = updatesWin.document.getElementsByTagName('textarea')[0];
    const comment = `${msg}
  @${arr.join(', @')}`;
    setNativeValue(textarea, comment, updatesWin);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(500);
    let postReplyBtn = updatesWin.document.querySelectorAll('[type=submit]')[1];
    console.debug(`${now()} -- Sumbitting reply..`);
    postReplyBtn.click();
    await sleep(7000);
  }
}

async function notifyUsers() {
  let updatesWin;
  try {
    console.debug(`Opening Support Page on updates section..`);
    updatesWin = open(LINK_TO_NOTIFICATIONS_COMMENT);
    await sleep(7000);
    const updatesDiv = updatesWin.document.getElementById(`#${LINK_TO_NOTIFICATIONS_COMMENT.split('#')[1]}`);
    if (!updatesDiv) throw new Error(`Unable to add reply to Service Updates section. Div not found.`);
    const replyBtn = updatesDiv.querySelectorAll('span[class="Comment__footer__controls"]')[0].children[0];

    const msgSingleResteem = 'Thanks for using my resteem service! Your post has been resteemed!';
    await addNotificationReply(
      updatesWin, replyBtn, resteemsDoneOnThisCycle, msgSingleResteem, 'resteems done', 'wait here too, could have just commented'
    );

    const msgExpiringUsers = `Your subscription is going to expire soon! Only 3 resteems left!
  If you enjoyed my service please consider [extending your subscription](https://steemit.com/resteem/@gasaeightyfive/tired-of-sending-payments-around-for-a-single-resteem)! &nbsp; : )`;
    await addNotificationReply(
      updatesWin, replyBtn, expiringUsers, msgExpiringUsers, 'expiring subscribers', 'wait'
    );

    const msgExpiredUsers = `Oh no! Your resteem subscription is now expired!
  If you enjoyed my service please consider [renewing your subscription](https://steemit.com/resteem/@gasaeightyfive/tired-of-sending-payments-around-for-a-single-resteem)! Thanks &nbsp; : )`;
    await addNotificationReply(
      updatesWin, replyBtn, expiredUsers, msgExpiredUsers, 'expired subscribers', 'wait'
    );

    subscribersGraveyard = [...new Set([...expiredUsers, ...subscribersGraveyard].slice(0, 200))]; // keep only last 200 expirations & no duplicates
    subscribersGraveyard.filter(el => !Object.keys(subscribersData).includes(el)); // remove from graveyard if user renewed subscription
    expiringUsers = [];
    expiredUsers = [];
    resteemsDoneOnThisCycle = [];
  } catch (err) {
    errors.push(`notifyUsers: ${err}`);
  } finally {
    updatesWin && !updatesWin.closed && updatesWin.close();
  }
}

let running2 = false;

async function startSubscribersService(mode = 'now') {
  if (keepItDown) {
    console.debug(`${now()} -- StartSubscribersService canceled. keepItDown is true.`);
    return;
  } else if (running2) {
    console.error(`Previous task still running! Let that finish first.`);
    return;
  }
  running2 = true;
  let windWallet;
  try {
    console.debug(`${now()} -- Getting rid of outdated content on this page (Status & Support Page)..`);
    semplifyUI();

    if (mode.toLowerCase() === 'now') {
      console.debug(`${now()} -- Going to start subscribers resteem service process..`);
    } else if (mode === 'timer') {
      console.debug(`${now()} -- ${RUN_EVERY_X_MINS} (or manually augmented) passed. Starting routine task..`);
    }

    // MAIN LOGIC

    console.debug(`${now()} -- Opening my wallet page..`);
    windWallet = open(`https://steemit.com/@${MY_ACCOUNT_NAME}/transfers`);
    await sleep(10000);
    console.debug(`${now()} -- Adding do not close warning..`);
    addWarning(windWallet);

    console.debug(`${now()} -- Checking for new subscribers on the transfers page..`);
    const newUsers = checkTransfers(windWallet);
    windWallet && windWallet.close();

    const usernames = Object.keys(newUsers);
    if (usernames.length) {
      console.debug(`${now()} -- >>>>>>>> Resteeming last post for ${usernames.length} new users (${
        usernames.slice(0,5).join(', ')
      } ..) and adding link to user state if found..`);
      await resteemLastPostAndAddLinkIfFound(newUsers); // { someuser: { paymentAmount: 1, (now:){{lastPostLink: 'https://'}} }, ... }
    }

    console.debug(`${now()} -- >>>>>>>>>>>>>>>>> Checking all ${Object.keys(subscribersData).length} subscribers for new posts to resteem..`);
    await findAndResteemNewPostForOldUsers();

    if (usernames.length) {
      console.debug(`${now()} -- Adding new users (initially resteemed) to db so next posts will be detected..`);
      addNewUsersToDb(newUsers);
    }

    if (errors.length) {
      const displayErrors = errors.slice().reverse(); // most recent on top
      addWarning(null, displayErrors);
      console.error(`THERE ARE ERRORS! ${displayErrors.map(e => `- ${e}\n`).join('')}`);
    }

    const expiringCopy = [...expiringUsers];
    const expiredCopy = [...expiredUsers];
    const singleResteemCopy = [...resteemsDoneOnThisCycle];
    if (LINK_TO_NOTIFICATIONS_COMMENT) {
      await notifyUsers();
      if (errors.length) addWarning(null, errors);
    }

    console.debug(`${now()} -- ${errors.length?'Completed with errors.':'SUCCESS. ALL COMPLETED WITHOUT ERRORS.'} <<<< \n
      Total subscribers: ${Object.keys(subscribersData).length}
      Total resteems: ${totResteemsCount} (since: ${startDate})
      Only today: ${todaysResteemsCount}
      DiscreteCommentsUpvotedToday: ${discreteCommentsUpvotedToday}
      Last Customer: ${lastTenJoined[0]}
      noSelfPromComment: for ${noSelfPromComment.length} users

      Expiring Users: ${JSON.stringify(expiringCopy)}
      Expired Users: ${JSON.stringify(expiredCopy)}
      Resteemed in this cycle: ${singleResteemCopy.length ? singleResteemCopy.join(', ') : 'none'}
      Users in Graveyard: ${subscribersGraveyard.length}

      (Use lastRun() to know last execution time and duration.)
    `);
  } finally {
    windWallet && windWallet.close && windWallet.close();
    running2 = false;
  }
}


// startup

const startupLocation = window.location.href;
if (startupLocation.indexOf('https://steemit.com') == -1) {
  alert('Gotta be on steemit, on the Status & Support page.');
  throw new Error('NOT_ON_STEEMIT');
}
if (startupLocation.indexOf(`/@${MY_ACCOUNT_NAME}/`) === -1) {
  alert('Please run this script on your Status & Support page.');
  throw new Error('NOT_ON_SUPPORT_PAGE');
}

const midnightReset = () => {
  discreteCommentsUpvotedToday = 0;
  todaysResteemsCount = 0;
}

let running = false;
let started = false;
let lastRunTime, lastEndTime;

async function startRoutine(mode) {
  if(!mode && !started
    && !confirm('Did you restore the db from localStorage? If not cancel and restore it first!')) return;
  if (!mode && started) throw new Error(`startRoutine already called, use startSubscribersService() now!`);
  started = true;
  const intervalMins = RUN_EVERY_X_MINS + addDelayInMinsHereIfNeeded;

  if (mode && BOT_OFF_AT_HOURS.indexOf(new Date().getHours()) !== -1) {
    console.debug(`${now()} Settings say that the bot must NOT run at this time. Resting.
      (exec semplifyUI() if first run)`);
    keepDown(true);
    setTimeout(() => startRoutine('auto'), intervalMins * 60 * 1000);
    return;
  } else {
    console.debug(`${now()} Settings say that the bot must run at this time. Running..`);
    keepDown(false);
  }

  lastRunTime = now();
  lastEndTime = '';
  if (running) {
    setTimeout(() => {
      console.debug(`Already running. Will try again in ${intervalMins} mins.`);
      startRoutine('auto')
    }, intervalMins * 60 * 1000);
    return console.error(`${now()}
      Previous task still running. New task execution canceled.
      To delay/anticipate the next task you can set at runtime a positive/negative value to "addDelayInMinsHereIfNeeded".`);
  }
  running = true;
  if (new Date().getHours() === 0 && new Date().getMinutes() <= intervalMins * 1.1) {
    midnightReset();
  }
  if ((new Date().getHours() === AUTO_X2_DAILY_BACKUP_AT || new Date().getHours() === ((AUTO_X2_DAILY_BACKUP_AT + 12) % 24))
    && new Date().getMinutes() <= intervalMins * 1.1) {
    storeStateInLocalStorage();
  }
  stopNow = false;
  setTimeout(() => startRoutine('auto'), intervalMins * 60 * 1000);
  await startSubscribersService('timer');
  running = false;
  lastEndTime = now();
}

const lastRun = () => console.debug(`${lastRunTime} -> ${lastEndTime ? lastEndTime : 'still running..'}`);

window.onbeforeunload = () => {
  return "Dude, are you sure you want to leave? Yours subscribers need you!";
};

removeUserFromSubscribers(MY_ACCOUNT_NAME, true); // no resteem btn
console.debug(`ALL READY! Execute startRoutine() to start.`);

document['ation'] = `
startRoutine();
// lastRun() // prints out the last time the task run
// startSubscribersService(); // to anticipate next execution (won't wait RUN_EVERY_X_MINS mins for next cycle)
  // overWriteSubscriberInDb('user', resteemsAvailable); // Eg. overWriteSubscriberInDb('user', 30)
  // addSubscriber(user, paid, lastLink, isManual); // Manual addition. Eg. addSubscriber('username', 0.5, 'https://steemit.com/blah', true)
  // updateDbToSubtractOneResteem('user'); // To decrease available resteems counter for specific user
  // addToBlackList('user');
  // removeFromBlacklist('user');
  // howManyResteemsLeft('user'); // prints out resteems left to user.
  // lastResteemedPost('user'); // prints out last resteemed link
  // overWriteSubscriberInDb(user, resteemsAvailable); // eg. overWriteSubscriberInDb('user', 3)
  // addOneMillionResteemsToUsers(userArr); // to migrate existing yougotresteemed's users. Eg. addOneMillionResteemsToUsers(['user1','user2']);
  // getAmountOfResteemsGivenPayAmount(paid); // reminder for the service charges. Eg. getAmountOfResteemsGivenPayAmount(0.5);
  // extractLastPost (userWin, user); // run this on user's blog to extract his own last post. Eg. extractLastPost ({document}, 'user');
    // extractLastPost ({window, document}, 'user'); // To manually extract last post link while on users blogs list page
    // getPreviousUsersPost('user'); // returns the subscriber's last link that we resteemed.
    // updateUsersLastLinkIfInDb(user, lastPost); // to manually override last resteemed link in db for the subscriber. Eg. updateUsersLastLinkIfInDb('user', 'https://steemit.com/blah');
      // forceStop(); // stops the task in progress (not the next ones..)
      // keepDown(value = true); // to stop all future tasks. To resume then use keepDown(false).
      // removeErrors(); // to close errors popup
      // storeStateInLocalStorage('subscribers') => { // 'subscribers' (variables included) or 'blacklist'. Saved automatically in localstorage every 12hs anyway.
      // recoverStateFromLocalStorage();
      // recoverStateFromDownloadedBackup(' REPLACE_THIS_STRING_WITH_ALL_THE_BACKUP_FILE_CONTENT ');
`;
