// =========================================================================
// CHANGE THESE vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

const ACCOUNT_NAME = 'YOUR_ACCOUNT_NAME_HERE' // ( eg. gaottantacinque - no @ ) <<~~---===## MANDATORY

const RANDOM_COMMENT_AFTER_RESTEEM_1 = `Done guys, thanks! :D`;
const RANDOM_COMMENT_AFTER_RESTEEM_2 = `Done! Thanks for using my free resteem service! :)`;
const RANDOM_COMMENT_AFTER_RESTEEM_3 = `All done until here guys`
const MENTION_USERS_IN_SEPARATORS = true;
const DELETE_OLD_SEPARATOR_WHEN_NEW_COMMENTS = false;

const MAX_LINKS_PER_USER = 3;

const SPECIAL_TREAT_TO_FIRSTCOMERS = true;
const HOW_MANY_FIRSTCOMERS = 10;

const SPECIAL_TREAT_IF_USER_RESTEEMS = true;
const KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_1 = 'resteemed';
const KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_2 = 're-steemed';
const KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_3 = 'reblogged';
const KEYWORD_IN_COMMENT_TO_GET_UPVOTE_AND_FOLLOW_4 = '~#_ADD KEYWORD HERE IF NEEDED#~';

const CHECK_NEW_COMMENTS_EVERY_N_MILLISECONS = 3600000;  // 1 HOUR
const OPEN_USER_LINK_TO_RESTEEM_EVERY_N_MILLISECONDS = 13000; // 13 seconds

// CHANGE THESE ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// =========================================================================



/* VERSION 1.0 */

// =============================== VARS
let oldSeparatorDelBtn = null;
let anchorsComments = [];
let toResteem = {};
let users = [];
let firstTenToUpvAndFollow = [];
let commentIds = [];
let lastAnchor = null;
let failed = [], warnings = [];
let errorsToShowOnUI = [];
let resteemsCount = 0;
const resteemedLinksOnThisPost = [];

// =============================== startup check
const currentLocation = window.location.href;
let startupOk = true;
if (currentLocation.indexOf('https://steemit.com') == -1 || currentLocation.indexOf(ACCOUNT_NAME) == -1) {
  startupOk = false;
  alert(`Error!\n\n${YOUR_ACCOUNT_NAME_HERE} you have to run this script on Steemit, on your newly created post..`);
}

// leave check
window.onbeforeunload = function() {
  return "Dude, are you sure you want to leave? Think of the kittens!";
}


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

const isMySeparator = (anchor) =>
  anchor.offsetParent && anchor.offsetParent.id.indexOf(`@${ACCOUNT_NAME}`) !== -1
  && anchor.href.indexOf(`@${ACCOUNT_NAME}`) !== -1
  && ( anchor.offsetParent.innerHTML.indexOf(RANDOM_COMMENT_AFTER_RESTEEM_1) !== -1
     || anchor.offsetParent.innerHTML.indexOf(RANDOM_COMMENT_AFTER_RESTEEM_2) !== -1
     || anchor.offsetParent.innerHTML.indexOf(RANDOM_COMMENT_AFTER_RESTEEM_3) !== -1 );

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

const comments = [
  RANDOM_COMMENT_AFTER_RESTEEM_1,
  RANDOM_COMMENT_AFTER_RESTEEM_2,
  RANDOM_COMMENT_AFTER_RESTEEM_3,
];
const getComment = () => {
  const randomId = Math.floor(Math.random() * comments.length - 1) + 1;
  return comments[randomId];
}

// ===============================  [[[[[[ ENTRY POINT ]]]]]]
let wPost;
if (startupOk) {
    buildUI();
    setInterval(() => buildUI(), 10 * 60000); // 5 mins
    setTimeout(() => processUsersComments(), 5000); // let the UI build first
    setInterval(() => processUsersComments(), CHECK_NEW_COMMENTS_EVERY_N_MILLISECONS);
}

async function processUsersComments() {
  if (!wPost || !wPost.close) {
    console.log(`Opening post ${window.location.href} in a new tab..`);
    wPost = open(window.location.href,'_blank');
    wPost.addEventListener('load', () => setTimeout(() => processUsersComments(), 5000));
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
    firstTenToUpvAndFollow = [];
    const commentsSection = wPost.document.getElementsByClassName('Post_comments__content')[0];
    if (!commentsSection) errorsToShowOnUI.push(`${new Date()} -- Cannot run readComments on this page: "${wPost.window.location.href}".<br>No comments section found.`);
    anchorsComments = commentsSection.getElementsByTagName('a');
    commentIds = Object.keys(anchorsComments);
    lastAnchor = anchorsComments[commentIds[commentIds.length - 5]];
    failed = [], warnings = [];
    if (!lastAnchor || isMySeparator(lastAnchor)) {
      console.log('>>>>>>>>> STOPPED. No comments to resteem..');
    } else {
      console.log('Getting links from comments');
      let skipNext = false;
      commentIds.forEach((idx) => {
        const anchor = anchorsComments[idx];
        if (isMySeparator(anchor)) {
          console.log('Comments found so far were already resteemed, discarding them');
          toResteem = {};
          if (commentIds.length > +idx + 6) {
            if (!skipNext) {
              console.log(`Position of old separator saved.`);
              const anchors = anchor.offsetParent.querySelectorAll('a');
              const delBtn = anchors[anchors.length - 1];
              oldSeparatorDelBtn = delBtn;
            }
            skipNext = skipNext ? false : true;
          }
          return;
        }
        const rightLink = anchor.href && anchor.href.split('/').length > 4 && notMine(anchor);
        const parent = anchor.offsetParent && anchor.offsetParent.id;
        if (anchor.href && anchor.href.indexOf('https://steemit.com/') !== -1
            && parent && rightLink) {
          try {
            const parentArr = parent.split('/');
            const notAchildComment = parentArr[1].indexOf(`/re-${ACCOUNT_NAME}`);
            const user = parentArr[0].substr(2, parentArr[0].length -1);
            if(firstTenToUpvAndFollow.length < HOW_MANY_FIRSTCOMERS
                && firstTenToUpvAndFollow.indexOf(user) == -1) {
              firstTenToUpvAndFollow.push(user);
            }
            if(Object.keys(toResteem).indexOf(user) == -1 && notAchildComment) {
              let added = false;
              'a,'.repeat(MAX_LINKS_PER_USER - 1).split(',').forEach((_,id) => {
                const userAlias = `${user}${id > 0 ? `-${id}` : ''}`; // user, user-1, user-2
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
    }
    users = Object.keys(toResteem);
    !users.length && console.log('---- END ----');
    k();
  } catch (err) {
    errorsToShowOnUI.push(`${new Date()} -- Error reading comments on post. Cause: ${err}`);
  }
}

async function replyToPost(k) {
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
    let myComment = getComment();
    if (MENTION_USERS_IN_SEPARATORS) {
      myComment += `\n@${users.join(', @')}`;
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
            buildUI();
            wPost && wPost.close && wPost.close();
            setTimeout(() => wPost = open(window.location.href, '_blank'), 300000);
          } else if (warnings.length) {
            console.error(`There are warnings. \n${JSON.stringify(warnings)}`);
          }
        }, 10000); // wait 10 seconds more for pending errors..
      }
    }, OPEN_USER_LINK_TO_RESTEEM_EVERY_N_MILLISECONDS);
  }
}

async function execService(user, link) {
  console.log(`Processing link ${link} for user ${user}`);
  let w;
  try {
    w = open(link);
    await nap(4000);
    const userInFirstTen_index = firstTenToUpvAndFollow.indexOf(user);
    if (userInFirstTen_index !== -1) {
      firstTenToUpvAndFollow.splice(userInFirstTen_index, 1);
    }
    const currentComment = wPost.document.getElementsByClassName('Post_comments__content')[0]
      .querySelectorAll(`[href='${link}']`)[0];
    const userMsg = currentComment && currentComment.parentElement
    && currentComment.parentElement.parentElement
      && currentComment.parentElement.parentElement.innerText
      && currentComment.parentElement.parentElement.innerText.toLowerCase();
    if ( (SPECIAL_TREAT_IF_USER_RESTEEMS && userSaysHeResteemed(userMsg)) ||
         (SPECIAL_TREAT_TO_FIRSTCOMERS && userInFirstTen_index !== -1 ) ) {
      console.log(`SPECIAL TREAT for user ${user}.\n 1. Upvoting post`);
      const upvoteBtn = w.document.getElementById('upvote_button')
      if (!upvoteBtn) {
        errorsToShowOnUI.push(`${new Date()} -- No upvote button found on post. User ${user}, link ${link}. Skipping.`);
        return;
      }
      if (upvoteBtn.firstChild.className.indexOf('chevron-up-circle') !== -1) {
        console.log(`Post ${link} Was already upvoted..`);
      } else {
        upvoteBtn.click();
        await nap(3000);
      }
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
    const resteemBtn = w.document.querySelectorAll('[title=Resteem]')[0]
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
const clearErrors = () => {
  errorsToShowOnUI = [];
  buildUI();
};

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
    <script>
      const clearErrors = () => { console.log(1);
        errorsToShowOnUI = [];
        ;
      };
    </script>
    <h3 style="margin:5px auto 20px">
      <b style="color:#8A2BE2">${ACCOUNT_NAME}</b>
    </h3>
    <div>
    <small style="color:yellow;float:right;margin-right:10px;margin-top:-50px">
      Do not close or refresh this tab unless you want to stop the script
    </small>
    <h5 style="color:#fcfcfc">RESTEEM SERVICE STATUS:</h5>
    <div style="float:right;padding:5px;border:thin solid green;margin-left:10px;color:#fcfcfc">
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
        `<p id="ok" style="color:green">${users.length ? 'OK' : 'No comments yet..'}</p>`
      }
    </div>
    ${
      errorsToShowOnUI.length ?
      `<p style="color:orange;margin-left:60px">To remove these errors execute in the console: &nbsp;<i>clearErrors()</i></p>` : ''
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
  } else {
    injectedDiv.innerHTML = content;
    console.log('UI refreshed');
  }
}

// MANUAL COMMANDS:
// processUsersComments()
// clearErrors()
// buildUI()
