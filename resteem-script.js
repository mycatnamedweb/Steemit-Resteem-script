// =========================================================================
// CHANGE THESE vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

let ACCOUNT_NAME = 'YOUR_ACCOUNT_NAME_HERE' // ( eg. gaottantacinque - no @ ) <<~~---===## MANDATORY

let NO_REPLY_TO_COMMENTERS = false; // NOTE: CHECK_NEW_COMMENTS too
const COMMENT_AFTER_RESTEEMS_1 = `Done so far, thanks! :D`;
const COMMENT_AFTER_RESTEEMS_2 = `Done! Thanks for using my free resteem service! :)`;
const COMMENT_AFTER_RESTEEMS_3 = `All done until here`
const EACH_BROWSER_DIFFERENT_COMMENT = true;
const MENTION_USERS_IN_SEPARATORS = true;
const DELETE_OLD_SEPARATOR_WHEN_NEW_COMMENTS = false;

let MAX_LINKS_PER_USER = 3;

let SPECIAL_TREAT_TO_FIRSTCOMERS = true;
const HOW_MANY_FIRSTCOMERS = 5;

const SPECIAL_TREAT_IF_USER_RESTEEMS = true;
const KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_1 = 'resteemed';
const KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_2 = 're-steemed';
const KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_3 = 'resteemd';
const KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_4 = '~#_ADD (lowercase) KEYWORD HERE IF NEEDED_#~';

const CHECK_NEW_COMMENTS_EVERY_N_MILLISECONS = 30 * 60 * 1000;  // 30 or 60 mins
const OPEN_USER_LINK_TO_RESTEEM_EVERY_N_MILLISECONDS = 13 * 1000; // 13 seconds

// CHANGE THESE ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// =========================================================================


/* VERSION 1.01 */

// =============================== VARS
let oldSeparatorDelBtn = null;
let anchorsComments = [];
let toResteem = {};
let users = [];
let firstTenToUpvAndFollow = [];
let failed = [], warnings = [];
let errorsToShowOnUI = [];
let resteemsCount = 0;
const resteemedLinksOnThisPost = [];
// const upvotedStore = {};

const storedBl = localStorage.getItem('blacklist-rs');
const blacklist = storedBl ? storedBl.split(',') : ['resteem.bot'];


// ================================ UTILITIES
function nap(durationMs) {
  console.log('Taking a nap..');
  const start = new Date().getTime();
  return new Promise(resolve => setTimeout(() => {
    console.log(`waking up after ${(new Date().getTime() - start) / 1000} seconds`)
    resolve();
  }, durationMs));
}

const setNativeValue = (element, value) => {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter.call(element, value);
  }
}

const addToBlackList = (user) => blacklist.push(user);

const isMySeparator = (anchor) =>
  anchor && anchor.offsetParent && anchor.offsetParent.id.indexOf(`@${ACCOUNT_NAME}`) !== -1
  && anchor.href.indexOf(`@${ACCOUNT_NAME}`) !== -1
  && ( anchor.offsetParent.innerHTML.indexOf(COMMENT_AFTER_RESTEEMS_1) !== -1
     || anchor.offsetParent.innerHTML.indexOf(COMMENT_AFTER_RESTEEMS_2) !== -1
     || anchor.offsetParent.innerHTML.indexOf(COMMENT_AFTER_RESTEEMS_3) !== -1 );

const notMine = (anchor) =>
  anchor.href.indexOf(`@${ACCOUNT_NAME}`) == -1

const userSaysHeResteemed = (userMsg = '') => {
  return !![
    KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_1,
    KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_2,
    KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_3,
    KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_4,
  ].filter(keyword => userMsg.toLowerCase().indexOf(keyword) !== -1).pop()
}

const extractUA = () => {
  const ua = navigator.userAgent.split(' ').pop().split('/')[0].toLowerCase();
  return ua === 'safari' ? 'chrome' : ua;
}

const getId = (brs = '') => {
  switch (brs.charAt(0).toUpperCase()) {
    case 'F':
      return 0;
    case 'O':
      return 1;
    case 'E': default:
      return 2;
  }
}

const comments = [
  COMMENT_AFTER_RESTEEMS_1,
  COMMENT_AFTER_RESTEEMS_2,
  COMMENT_AFTER_RESTEEMS_3,
];
const getComment = (oneUserOnly = false) => {
  if (oneUserOnly) return COMMENT_AFTER_RESTEEMS_2;
  if (EACH_BROWSER_DIFFERENT_COMMENT) {
    const brsId = getId(extractUA());
    return comments[brsId];
  } else {
    const randomId = Math.floor(Math.random() * comments.length - 1) + 1;
    return comments[randomId];
  }
}

const openPost = () => open(window.location.href,'_blank');

const addDoNotCloseWarning = (wPost) => {
  try {
    if (!wPost) throw new Error(`Reference to the post window was missing in addDoNotCloseWarning.`);
    console.log('Adding donotclosewarning to other tab..');
    const divToAdd = wPost.document.createElement('div');
    divToAdd.id = 'donotclosewarning';
    const myStyle = divToAdd.style;
    myStyle.border = '2px solid red';
    myStyle.padding = '10px';
    myStyle['text-align'] = 'center';
    myStyle.width = '100%';
    myStyle.position = 'fixed';
    myStyle.top = '0';
    myStyle.left = '0';
    divToAdd.innerHTML = `<h4 style="color:red">PLEASE DO NOT CLOSE THIS WINDOW.<br>Processing comments on it..</h3>`;
    wPost.document.body.insertBefore(divToAdd, wPost.document.body.firstChild);
    const headerStyle = wPost.document.getElementsByTagName('header')[0].style;
    headerStyle.position = 'relative';
    headerStyle['background-color'] = 'transparent';
  } catch (err) {
    console.error(`Error in addDoNotCloseWarning: ${err}`);
  }
}

// const addUpvotedUserManual = (user, link) => upvotedStore[user] = link;

// ===============================  [[[[[[ ENTRY POINT ]]]]]]
let wPost;
let retriedAlready = false;

async function processUsersComments() {
  if (!wPost || !wPost.close || wPost.closed) {
    console.log(`Opening post ${window.location.href} in a new tab..`);
    wPost = open(`${window.location.href}?sort=new#comments`,'_blank');
    wPost.addEventListener('load', () => {
      setTimeout(() => processUsersComments(), 5000);
      addDoNotCloseWarning(wPost);
    });
    setTimeout(() => {
      if (!wPost || !wPost.document.getElementsByClassName('Post_comments__content')[0]) {
        console.error(`After 15 s the post is still not there. Closing window. Will trying once again in 1 min.`);
        wPost && !wPost.closed && wPost.close();
        wPost = null;
        if (!retriedAlready) {
          setTimeout(() => processUsersComments(), 60 * 1000);
          retriedAlready = true;
        } else {
          retriedAlready = !retriedAlready;
        }
      }
    }, 15 * 1000);
    return;
  }
  readComments(() => {
    users.length && replyToPost(() => {
      users.length && startResteems();
    });
  });
}

async function readComments(k) {
  try {
    oldSeparatorDelBtn = null;
    toResteem = {};
    users = [];
    // const upvotedLinks = {};

    const commentsSection = wPost.document.getElementsByClassName('Post_comments__content')[0];
    if (!commentsSection) {
      errorsToShowOnUI.push(`${new Date()} -- Cannot run readComments on this page: "${wPost.window.location.href}".<br>No comments section found.`);
      wPost.close();
      setTimeout(() => processUsersComments(), 60 * 1000);
      return console.error(`Unable to read comments, page did not load correctly. Will retry in 30 seconds.`);
    }
    anchorsComments = commentsSection.getElementsByTagName('a');
    const commentIds = Object.keys(anchorsComments);
    const lastAnchor = anchorsComments[commentIds[commentIds.length - 5]];
    failed = [], warnings = [];

    console.log('Getting links from comments');
    if (!lastAnchor) {
      console.log('>>>>> NO LINKS ON YOUR POST YET.');
      k();
    }
    let skipNext = false;
    let noMoreBcFoundSeparator = false;
    commentIds.forEach((idx) => {
      const anchor = anchorsComments[idx];
      if (isMySeparator(anchor)) {
        console.log('Comments found so far were already resteemed, discarding them');
        // toResteem = {};
        if (commentIds.length > +idx + 6) {
          if (!skipNext) {
            console.log(`Position of old separator saved.`);
            const anchors = anchor.offsetParent.querySelectorAll('a');
            const delBtn = anchors[anchors.length - 1];
            oldSeparatorDelBtn = delBtn;
            noMoreBcFoundSeparator = true;
          }
          skipNext = skipNext ? false : true;
        }
        return;
      }
      if (noMoreBcFoundSeparator) return;

      const rightLink = anchor.href && anchor.href.split('/').length > 4 && notMine(anchor);
      const parent = anchor.offsetParent && anchor.offsetParent.id;
      if (anchor.href && anchor.href.indexOf('https://steemit.com/') !== -1
          && parent && rightLink) {
        try {
          const parentArr = parent.split('/');
          const notAchildComment = parentArr[1].indexOf(`/re-${ACCOUNT_NAME}`) == -1;
          const user = parentArr[0].substr(2, parentArr[0].length -1);
          if(firstTenToUpvAndFollow.length < HOW_MANY_FIRSTCOMERS
              && firstTenToUpvAndFollow.indexOf(user) == -1
              && blacklist.indexOf(user) == -1) {
            firstTenToUpvAndFollow.push(user);
          }
          if(notAchildComment && blacklist.indexOf(user) === -1) {
            let added = false;
            'a,'.repeat(MAX_LINKS_PER_USER - 1).split(',').forEach((_,id) => {
              const userAlias = `${user}${id > 0 ? `~${id}` : ''}`; // user, user~1, user~2
              if (!added && toResteem[userAlias] == undefined) {
                toResteem[userAlias] = anchor.href;
                added = true;
              }
            })
          }
        } catch (err) {
          errorsToShowOnUI.push(`${new Date()} -- Error processing link ${anchor.href}. Cause: ${err}`);
        }
      }
    });
    console.log(`Links to resteem: ${Object.keys(toResteem).length} -->> ${JSON.stringify(toResteem)}`);
    users = Object.keys(toResteem);
    if (!users.length) {
      console.log(`${new Date().toString().split(' ').slice(1,5).join(' ')} :: ---- END ----`);
      if (wPost && !wPost.closed) {
        wPost.close();
        wPost = null;
      }
    }
    k();
  } catch (err) {
    errorsToShowOnUI.push(`${new Date()} -- Error reading comments on post. Cause: ${err}`);
  }
}

async function replyToPost(k) {
  if (NO_REPLY_TO_COMMENTERS) {
    k();
    return;
  }
  try {
    if (oldSeparatorDelBtn && DELETE_OLD_SEPARATOR_WHEN_NEW_COMMENTS) {
      try {
        console.log('Deleting old separator since there are new comments to process..');
        oldSeparatorDelBtn.click();
        await nap(2000);
        const confirmBtn = wPost.document.getElementsByClassName('ConfirmTransactionForm')[0].children[4];
        confirmBtn.click();
        await nap(3000);
      } catch (err) {
        errorsToShowOnUI.push(`${new Date()} -- Unable to delete old separator! Cause: ${err} \nContinuing..`);
      }
    }
    oldSeparatorDelBtn = null;
    let myComment = getComment(users.length === 1);
    if (MENTION_USERS_IN_SEPARATORS) {
      let usersNoAlias = [];
      users.forEach((u) => {
        const cleaned = u.replace('~1','').replace('~2','');
        if (usersNoAlias.indexOf(cleaned) === -1 && blacklist.indexOf(cleaned) === -1)
          usersNoAlias.push(cleaned);
      });
      if (usersNoAlias.length) myComment += `\n@${usersNoAlias.join(', @')}`;
    }
    console.log(`Adding comment: ${myComment}`);
    let replyBtn = document.getElementsByClassName('PostFull__reply')[0]
      .getElementsByTagName('a')[0];
    replyBtn.click();
    await nap(500);
    let textarea = document.getElementsByTagName('textarea')[0];
    setNativeValue(textarea, myComment);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nap(500);
    let postReplyBtn = document.querySelectorAll('[type=submit]')[0];
    console.log(`Sumbitting reply..`);
    postReplyBtn.click();
    await nap(1000);
  } catch (err) {
    errorsToShowOnUI.push(`${new Date()} -- Error adding separator. Cause: ${err} \nContinuing..`);
  }
  k();
}

let intervalValueRul;
async function startResteems() {
  let idx = 0;
  if(users.length) {
    console.log('==========> Launching all resteems..!');
    intervalValueRul = setInterval(() => {
      if(idx < users.length) {
        execService(users[idx], toResteem[users[idx]]);
        idx++;
        buildUI();
      } else if (idx === users.length) {
        idx = 8888;
        setTimeout(() => {
          if (failed.length) {
            clearInterval(intervalValueRul);
            alert(`THERE ARE ERRORS! (you can close this to see them on top of the page)
              Failed:
              ${JSON.stringify(failed)}\n
              Warnings:
              ${JSON.stringify(warnings)}
            `);
            errorsToShowOnUI.push(`${new Date()} -- RESTEEMS END.
              Failed resteems: ${JSON.stringify(failed)}.
              Warnings: ${warnings.length ? JSON.stringify(warnings) : 'none.'}
            `);
          } else if (warnings.length) {
            console.error(`There are warnings. \n${JSON.stringify(warnings)}`);
          }
          buildUI();
          if (wPost && !wPost.closed) {
            wPost.close();
            wPost = null;
          }
          localStorage.setItem('dailyScriptBot_result', resteemsCount);
        }, 10000); // wait 10 seconds more for pending errors..
      }
    }, OPEN_USER_LINK_TO_RESTEEM_EVERY_N_MILLISECONDS);
  }
}

const isPostUpvoteBtn = (upvoteBtn, w) => {
  let resteemerName;
  const block = upvoteBtn.parentElement.parentElement.parentElement.parentElement.parentElement;
  if (block.children[0].innerText.split('by ').length === 1) {
    resteemerName = block.parentElement.children[0].innerText.split('by ')[1].split(' (')[0];
  } else {
    resteemerName = block.children[0].innerText.split('by ')[1].split(' (')[0];
  }
  return w.window.location.href.indexOf(resteemerName) !== -1;
}

const isRightWeightBtn = (weightBtn, win) => {
  try {
    const name = weightBtn.parentElement.parentElement.parentElement
      .parentElement.parentElement.parentElement.parentElement
      .parentElement.parentElement
      .innerText.split('by ')[1].split(' (')[0]
    return win.window.location.href.indexOf(name) !== -1;
  } catch (err) {
    console.error(err);
    return false;
  }
}

async function execService(user, link) {
  console.log(`Processing link ${link} for user ${user}`);
  let w;
  try {
    if (blacklist.indexOf(user.split('~')[0]) !== -1) {
      console.log(`Service for blacklisted user rejected.`);
      return;
    }
    w = open(link);
    await nap(5000);
    const userInFirstTen_index = firstTenToUpvAndFollow.indexOf(user);
    const currentComment = wPost.document.getElementsByClassName('Post_comments__content')[0]
      .querySelectorAll(`[href='${link}']`)[0];
    const userMsg = currentComment && currentComment.parentElement
    && currentComment.parentElement.parentElement
      && currentComment.parentElement.parentElement.innerText
      && currentComment.parentElement.parentElement.innerText.toLowerCase();
    if ( (SPECIAL_TREAT_IF_USER_RESTEEMS && userSaysHeResteemed(userMsg)) ||
         (SPECIAL_TREAT_TO_FIRSTCOMERS && userInFirstTen_index !== -1 ) ) {
      console.log(`SPECIAL TREAT for user ${user}.\n 1. Upvoting post`);
      const upvBtnType1 = w.document.getElementById('upvote_button');
      const upvBtnBlock = w.document.querySelectorAll('span[class="Voting__button Voting__button-up"]')[0];
      const upvBtnType2 = upvBtnBlock && upvBtnBlock.firstChild.firstChild;
      const upvoteBtn = upvBtnType1 || upvBtnType2;
      if (!upvoteBtn || !isPostUpvoteBtn(upvoteBtn, w)) {
        errorsToShowOnUI.push(`${new Date()} -- No upvote button found on post. User ${user}, link ${link}. Skipping.`);
        return;
      }
      // if (upvoteBtn.title === 'Remove Vote') {
      //   console.log(`Post ${link} Was already upvoted..`);
      // } else if (upvoteBtn.title === 'Upvote') {
        upvoteBtn.click();
        await nap(3000);
        const weightBtn = w.document.querySelectorAll('a[class="confirm_weight"]')[0];
        if (weightBtn) {
          if (!isRightWeightBtn(weightBtn, w)) {
            errorsToShowOnUI.push(`Weight button was not the post one for user ${user}. Not clicked.`);
          } else {
            weightBtn.click();
            await nap(3000);
          }
        }
      // }
      const dropdownArrow = w.document.getElementsByClassName('Icon dropdown-arrow')[0];
      if (!dropdownArrow) {
        errorsToShowOnUI.push(`${new Date()} -- No follow button found for user ${user} and link ${link}. Skipping.`);
        return;
      }
      dropdownArrow.click();
      await nap(500);
      console.log(`2. Clicking on FOLLOW for user ${user}`);
      const followBtn = w.document.getElementsByClassName('button slim hollow secondary ')[0];
      if (followBtn.innerText.toUpperCase() === 'FOLLOW') {
        followBtn.click();
        await nap(5000);
        if(followBtn.innerText.toUpperCase() !== 'UNFOLLOW') {
          const msg = `(maybe) was not able to follow ${user}`;
          warnings.push(msg);
          console.log(msg);
        }
      }
    }

    console.log('Resteeming post for user', user);
    const resteemBtn = w.document.querySelectorAll('a[title=Resteem]')[0]
    if (!resteemBtn) {
      errorsToShowOnUI.push(`${new Date()} -- Resteem button not found for user ${user} and link ${link}. Post may be expired.`);
      return;
    }
    resteemBtn.click();
    await nap(500);
    console.log('Confirming Resteem..');
    const confirmForm = w.document.getElementsByClassName('ConfirmTransactionForm')[0]
    if(confirmForm) {
      confirmForm.getElementsByTagName('button')[0].click();
      await nap(3000);
    }
    const resteemOk = w.document.getElementsByClassName('Reblog__button Reblog__button-active')[0];
    if(resteemOk && confirmForm) {
      console.log('==> SUCCESS.');
      if (resteemedLinksOnThisPost.indexOf(link) == -1) {
        resteemedLinksOnThisPost.push(link);
        resteemsCount++;
      }
    } else if (resteemOk && !confirmForm) {
      errorsToShowOnUI.push(`${new Date()} -- Post Was already resteemed. User: ${user}`);
    } else {
      const msg = `FAILED? Grey Resteem for ${user} -> ${link}`;
      console.log(msg);
      if (resteemedLinksOnThisPost.indexOf(link) == -1) {
        resteemedLinksOnThisPost.push(link);
        resteemsCount++;
      }
    }
  } catch(err) {
      errorsToShowOnUI.push(`${new Date()} -- Something went wrong processing post for user ${user}. Error: `, err);
  } finally {
    w.close();
  }
}

// ===============================  BASIC UI
const removeErrors = () => {
  errorsToShowOnUI = [];
  buildUI();
};
document.clean = () => { clearErrors(); }

async function buildUI () {
  let divToAdd;
  let prevState;
  const x = document.getElementsByTagName('body')[0];
  const injectedDiv = document.getElementById('injected-ui');
  if (!injectedDiv) {
    console.log('Building the UI ..');
    divToAdd = document.createElement('div');
    divToAdd.id = 'injected-ui';
    divToAdd.style.padding = '20px'
    divToAdd.style['background-color'] = '#333333';
  } else {
    console.log('Refreshing the UI ..');
  }
  const content = `
    <h3 style="margin:5px auto 20px">
      <b style="color:#8A2BE2">${ACCOUNT_NAME}</b>
    </h3>
    <div>
    <small style="color:yellow;float:right;margin-right:10px;margin-top:-50px">
      Do not close or refresh this tab unless you want to stop the script
    </small>
    <h5 style="color:#fcfcfc">RESTEEM SERVICE STATUS:</h5>
    <div style="float:right;padding:5px;border:thin solid grey;margin-left:10px;color:#fcfcfc">
      Resteemed: ${resteemsCount}
    </div>
    <div style="max-height:600px;border:thin solid grey;overflow:auto;padding:15px">
      ${errorsToShowOnUI.length ?
        `<p id="errors" style="color:red">ERRORS</p>
         <ul style="color:#fcfcfc">
           ${errorsToShowOnUI.map(err => `<li>${err}</li>`).reverse().join('')}
         </ul>
        `
        :
        `${users.length ? '<p style="color:green">OK</p>' : '<p style="color:#fcfcfc">No comments yet..</p>'}`
      }
    </div>
    ${
      errorsToShowOnUI.length ? // onclick="document.clean()" -> CSP issue
      `<p style="margin-left:60px">
        <button style="color:orange;border:thin solid orange;padding:5px;margin-top:5px;cursor:pointer">
          REMOVE ERRORS
        </button> <small style="color:orange"> -> works only in Edge. For other browsers execute in console: &nbsp; <i>removeErrors()</i></small>
      </p>` : ''
    }
  `;
  const topDiv = document.getElementById('content');
  if (divToAdd) {
    divToAdd.style.padding = '5px';
    divToAdd.innerHTML = content;
    document.body.insertBefore(divToAdd, document.body.firstChild);
    console.log('UI created. Now getting rid of some outdated steemit content..');
    document.getElementsByClassName('Post_comments__content')[0].innerHTML = '';
    document.getElementsByClassName('PostFull__time_author_category_large vcard')[0].innerHTML = '';
    document.getElementsByClassName('PostFull__body entry-content')[0].innerHTML = '';
    document.getElementsByClassName('PostFull__time_author_category vcard')[0].innerHTML = '';
    document.getElementsByClassName('columns medium-12 large-2 ')[0].innerHTML = '';
    document.getElementsByClassName('PostFull__responses')[0].innerHTML = '';
    document.getElementsByClassName('Header')[0].innerHTML = '';
    const title = document.getElementsByClassName('entry-title')[0];
    title.innerHTML = `<a href=${window.location.href} target="_blank">
      <u>${title.innerText}</u> <small>{{ click to open in new tab }}</small>
    </a>`;
  } else {
    injectedDiv.innerHTML = content;
    console.log('UI refreshed');
  }
}


// =============================== startup

window.onbeforeunload = function() {
  localStorage.setItem('blacklist-rs', blacklist);
  return "Dude, are you sure you want to leave? Think of the kittens!!";
}

const start = () => {
  if (ACCOUNT_NAME === 'YOUR_ACCOUNT_NAME_HERE') {
    alert(`Error!\n\nBefore running this script you have to change the variable YOUR_ACCOUNT_NAME_HERE to your account name..`);
    return;
  }
  const currentLocation = window.location.href;
  if (currentLocation.indexOf('https://steemit.com') == -1
    || currentLocation.indexOf(ACCOUNT_NAME) == -1) {
    alert(`Error!\n\n${ACCOUNT_NAME} you have to run this script on Steemit, on your newly created post..`);
    return;
  }
  localStorage.setItem('dailyScriptBot_result', '0');
  buildUI();
  setInterval(() => errorsToShowOnUI.length && buildUI(), 60000); // 1 min
  setTimeout(() => processUsersComments(), 5000); // let the UI build first
  setInterval(() => processUsersComments(), CHECK_NEW_COMMENTS_EVERY_N_MILLISECONS);
}

document['ation'] = `
        // https://github.com/mycatnamedweb/Steemit-Resteem-script/blob/master/resteem-script.js

        // -------- MANUAL COMMANDS: --------
        //       processUsersComments()
        //          removeErrors()
        //            openPost()
        //            buildUI()
        // PS. addUpvotedUserManual('user', 'https..')

  // SPECIAL_TREAT_TO_FIRSTCOMERS = false;
  // MAX_LINKS_PER_USER = 1;
  // NO_REPLY_TO_COMMENTERS = true;
  ACCOUNT_NAME = 'YOUR_ACCOUNT_NAME_HERE'; // normal browsers only..
  start();
`;
