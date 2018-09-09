// =========================================================================
// CHANGE THESE vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

let ACCOUNT_NAME = 'YOUR_ACCOUNT_NAME_HERE' // ( eg. gaottantacinque - no @ ) <<~~---===## MANDATORY

let logsOn = false;

let NO_REPLY_TO_COMMENTERS = false;
const COMMENT_AFTER_RESTEEMS_1 = `RESTEEMS done so far, thanks! :D`;
const COMMENT_AFTER_RESTEEMS_2 = `RESTEEM done! Thanks for using my free resteem service! :)`;
const COMMENT_AFTER_RESTEEMS_3 = `All RESTEEMS done until here`
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
const now = () => new Date().toString().split(' ').slice(1,5).join(' ');

function nap(durationMs) {
  logsOn && console.debug('Taking a nap..');
  const start = new Date().getTime();
  return new Promise(resolve => setTimeout(() => {
    logsOn && console.debug(`${now()} -- waking up after ${(new Date().getTime() - start) / 1000} seconds`)
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
  if (oneUserOnly) return COMMENT_AFTER_RESTEEMS_3;
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
    logsOn && console.debug('Adding donotclosewarning to other tab..');
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
    logsOn && console.error(`Error in addDoNotCloseWarning: ${err}`);
  }
}

// const addUpvotedUserManual = (user, link) => upvotedStore[user] = link;

// ===============================  [[[[[[ ENTRY POINT ]]]]]]
let wPost;
let retriedAlready = false;

async function processUsersComments() {
  if (!wPost || !wPost.close || wPost.closed) {
    logsOn && console.debug(`${now()} -- Opening post ${window.location.href} in a new tab..`);
    wPost = open(`${window.location.href}?sort=new#comments`,'_blank');
    wPost.addEventListener('load', () => {
      setTimeout(() => processUsersComments(), 5000);
      addDoNotCloseWarning(wPost);
    });
    setTimeout(() => {
      if (!wPost || !wPost.document.getElementsByClassName('Post_comments__content')[0]) {
        logsOn && console.error(`After 30 s the post is still not there. Closing window. Will trying once again in 1 min.`);
        wPost && !wPost.closed && wPost.close();
        wPost = null;
        if (!retriedAlready) {
          setTimeout(() => processUsersComments(), 60 * 1000);
          retriedAlready = true;
        } else {
          retriedAlready = !retriedAlready;
        }
      }
    }, 30 * 1000);
    return;
  }
  logsOn && console.debug(`${now()} -- ok, window found. Starting..`);
  readComments(() => {
    users.length && replyToPost(() => {
      users.length && startResteems();
    });
  });
}

let storedLastCommentTxt = '';

const closeWin = () => {
  if (wPost && !wPost.closed) {
    wPost.close();
    wPost = null;
  }
}

async function expandIfMyPostAndHidden(w, user) {
  var showButton = w.document.querySelectorAll('button[class="button hollow tiny float-right"]')[0];
  if (showButton && showButton.innerText.toLowerCase() === 'show') {
    logsOn && console.error(`My post was hidden. Expanding it..`);
    const currLocation = w.window.location.href;
    if (currLocation.indexOf(ACCOUNT_NAME) === -1) {
      throw new Error(`Hidden post for user ${user} - and it's not me`);
    }
    logsOn && console.debug(`${now()} -- Clicking..`);
    showButton.click();
    await nap(1000);
  } else {
    logsOn && console.debug(`${now()} -- No need to expand the post.`);
  }
}

async function readComments(k) {
  try {
    oldSeparatorDelBtn = null;
    toResteem = {};
    users = [];
    // const upvotedLinks = {};

    await expandIfMyPostAndHidden(wPost, 'some-user');

    const commentsSection = wPost.document.getElementsByClassName('Post_comments__content')[0];
    if (!commentsSection) {
      errorsToShowOnUI.push(`${new Date()} -- Cannot run readComments on this page: "${wPost.window.location.href}".<br>No comments section found.`);
      wPost && wPost.close();
      setTimeout(() => processUsersComments(), 60 * 1000);
      return logsOn && console.error(`Unable to read comments, page did not load correctly. Will retry in 30 seconds.`);
    }
    if (NO_REPLY_TO_COMMENTERS) {
      const lastCommentTxt = commentsSection.querySelectorAll('div[class="Comment__body entry-content"]')[0].innerText;
      if (lastCommentTxt === storedLastCommentTxt) {
        logsOn && console.debug(`${now()} -- No replies to users and latest comment matches. Stopping.`);
        k();
        closeWin(wPost);
        return;
      }
      storedLastCommentTxt = lastCommentTxt;
    }

    anchorsComments = commentsSection.getElementsByTagName('a');
    const commentIds = Object.keys(anchorsComments);
    const lastAnchor = anchorsComments[commentIds[commentIds.length - 5]];
    failed = [], warnings = [];

    logsOn && console.debug('Getting links from comments');
    if (!lastAnchor) {
      logsOn && console.debug('>>>>> NO LINKS ON YOUR POST YET.');
      k();
      closeWin(wPost);
      return;
    }
    let skipNext = false;
    let noMoreBcFoundSeparator = false;
    commentIds.forEach((idx) => {
      const anchor = anchorsComments[idx];
      if (isMySeparator(anchor)) {
        logsOn && console.debug('Comments found so far were already resteemed, discarding them');
        // toResteem = {};
        if (commentIds.length > +idx + 6) {
          if (!skipNext) {
            logsOn && console.debug(`${now()} -- Position of old separator saved.`);
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
              const link = anchor.href;
              if (!added && toResteem[userAlias] == undefined
                  && link.indexOf('@resteem.bot') == -1 && link.indexOf('resteem-bot-as') == -1 && link.indexOf('@rcr.bis') == -1
                  && link.indexOf('/trending/') == -1 && link.indexOf('/byteball/') == -1 && link.indexOf('/created/') == -1 && link.indexOf('RESTEEMS_LEFT') === -1) {
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
    logsOn && console.debug(`${now()} -- Links to resteem: ${Object.keys(toResteem).length} -->> ${JSON.stringify(toResteem)}`);
    users = Object.keys(toResteem);
    if (!users.length) {
      logsOn && console.debug(`${now()} -- ${new Date().toString().split(' ').slice(1,5).join(' ')} :: ---- END ----`);
      closeWin(wPost);
    }
    k();
  } catch (err) {
    errorsToShowOnUI.push(`${new Date()} -- Error reading comments on post. Cause: ${err}`);
  }
}

async function replyToPost(k) {
  if (NO_REPLY_TO_COMMENTERS || users.length === 1) {
    k();
    return logsOn && console.debug('No reply added.'); // if one alone just wait for next one..
  }
  try {
    if (oldSeparatorDelBtn && DELETE_OLD_SEPARATOR_WHEN_NEW_COMMENTS) {
      try {
        logsOn && console.debug('Deleting old separator since there are new comments to process..');
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
        if (usersNoAlias.indexOf(cleaned) === -1 && blacklist.indexOf(cleaned) === -1 && toResteem[u].indexOf('@') !== -1) {
          usersNoAlias.push(cleaned);
        }
      });
      if (usersNoAlias.length) myComment += `\n@${usersNoAlias.join(', @')}`;
    }
    logsOn && console.debug(`${now()} -- Adding comment: ${myComment}`);
    let replyBtn = document.getElementsByClassName('PostFull__reply')[0]
      .getElementsByTagName('a')[0];
    replyBtn.click();
    await nap(500);
    let textarea = document.getElementsByTagName('textarea')[0];
    setNativeValue(textarea, myComment);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nap(500);
    let postReplyBtn = document.querySelectorAll('[type=submit]')[0];
    logsOn && console.debug(`${now()} -- Sumbitting reply..`);
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
    logsOn && console.debug('==========> Launching all resteems..!');
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
            logsOn && console.error(`There are warnings. \n${JSON.stringify(warnings)}`);
          }
          buildUI();
          if (wPost && !wPost.closed) {
            logsOn && console.debug(`${now()} -- Closing the window..`);
            wPost.close();
            wPost = null;
          } else {
            logsOn && console.debug(`${now()} -- NOT closing the window. Null or already closed.`);
          }
          localStorage.setItem('dailyScriptBot_result', resteemsCount);
        }, 10000); // wait 10 seconds more for pending errors..
      }
    }, OPEN_USER_LINK_TO_RESTEEM_EVERY_N_MILLISECONDS);
  }
}

const isPostUpvoteBtn = (upvoteBtn, link) => {
  logsOn && console.debug(`${now()} -- -- checking if it's post upvote btn..`);
  let resteemerName;
  let block;
  try {
    block = upvoteBtn.parentElement.parentElement.parentElement.parentElement.parentElement;
    if (block.children[0].textContent.split('by ').length === 1) {
      logsOn && console.debug('branch1');
      // resteemerName = block.parentElement.children[0].textContent.split('by ')[1].split(' (')[0];
      resteemerName = block.parentElement.querySelectorAll('a[class="ptc"]')[0].href.split('/').pop();
    } else {
      logsOn && console.debug('branch2');
      resteemerName = block.children[0].textContent.split('by ')[1].split(' (')[0];
    }
    logsOn && console.debug(`${now()} -- Upvote button of user ${resteemerName}`);
    const isPostUb = link.indexOf(resteemerName) !== -1;
    if (!isPostUb) errorsToShowOnUI.push(`=====>> It's not post upvote button. Not clicked! Link: ${link}`);
    return isPostUb;
  } catch (err) {
    const msg = `${new Date()} _ isPostUpvoteBtn -- ===>> Err: ${err}`;
    logsOn && console.error(msg);
    errorsToShowOnUI.push(msg);
    return false;
  }
}

const isRightWeightBtn = (weightBtn, link) => {
  logsOn && console.debug(`${now()} -- Checking weight btn ownership..`);
  let block;
  let name;
  try {
    block = weightBtn.parentElement.parentElement.parentElement
      .parentElement.parentElement.parentElement.parentElement
      .parentElement.parentElement;
    const nameArr = (block.innerText || '').split(' by ');
    if (nameArr[1] && nameArr.length == 2) {
      logsOn && console.debug(`${now()} -- name found after "by "`);
      name = nameArr[1].split(' (')[0];
    } else {
      if (nameArr.length > 2) {
        errorsToShowOnUI.push(`Found more than one result for split by "by". Link: ${link}`);
      }
      logsOn && console.debug(`${now()} -- name not found after "by ". Trying with class ptc..`);
      // if html but no text -> class ptc and split ' ('[0]
      const fromPtc = block.parentElement.parentElement.querySelectorAll('a[class="ptc"]')[0];
      if (fromPtc) name = fromPtc.textContent.split(' (')[0];
    }
    if (!name) {
      logsOn && console.debug(`${now()} -- name not found after "by" nor with ptc. Trying getting text from parent..`);
      // else try go up one parent
      const splitted = block.parentElement.parentElement.textContent.split(' by ');
      if (splitted.length > 2) {
        errorsToShowOnUI.push(`Found more than one result for split by "by". Link: ${link}`);
        return false;
      }
      name = splitted[1].split(' (')[0];
    }
    logsOn && console.debug(`${now()} -- The owner is ${name}`);
    const isRightWb = link.indexOf(`@${name.replace('@','')}`) !== -1;
    if (!isRightWb) errorsToShowOnUI.push(`=====>>> It's not the right weight button. Not clicked! Name found: ${name}. Link: <a href="${link}" target="_blank">${link}</a>`);
    return isRightWb;
  } catch (err) {
    const msg = `${new Date()} _ isRightWeightBtn -- ====>>> Err: ${err}. Link: ${link}. Block html: ${block.innerHTML}`;
    logsOn && console.error(msg);
    errorsToShowOnUI.push(msg);
    return false;
  }
}

async function execService(user = '', link) {
  logsOn && console.debug(`${now()} -- Processing link ${link} for user ${user}`);
  let w;
  try {
    if (blacklist.indexOf(user.split('~')[0]) !== -1) {
      logsOn && console.debug(`${now()} -- Service for blacklisted user rejected.`);
      return;
    }
    if (link.indexOf('@') == -1 || link.indexOf('/@resteem.bot') !== -1) {
      logsOn && console.debug(`${now()} -- Unathorized link. Skipping.`);
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
      logsOn && console.debug(`${now()} -- SPECIAL TREAT for user ${user}.\n 1. Upvoting post`);
      const upvBtnType1 = w.document.getElementById('upvote_button');
      const upvBtnBlock = w.document.querySelectorAll('span[class="Voting__button Voting__button-up"]')[0];
      const upvBtnType2 = upvBtnBlock && upvBtnBlock.firstChild.firstChild;
      const upvoteBtn = upvBtnType1 || upvBtnType2;
      if (!upvoteBtn || !isPostUpvoteBtn(upvoteBtn, link)) {
        errorsToShowOnUI.push(`${new Date()} -- No upvote button found on post. User ${user}, link ${link}. Skipping.`);
        return;
      }
      // if (upvoteBtn.title === 'Remove Vote') {
      //   logsOn && console.debug(`${now()} -- Post ${link} Was already upvoted..`);
      // } else if (upvoteBtn.title === 'Upvote') {
        upvoteBtn.click();
        await nap(3000);
        const weightBtn = w.document.querySelectorAll('a[class="confirm_weight"]')[0];
        if (weightBtn && isRightWeightBtn(weightBtn, link)) {
          weightBtn.click();
          await nap(3000);
        }
      // }
      const dropdownArrow = w.document.getElementsByClassName('Icon dropdown-arrow')[0];
      if (!dropdownArrow) {
        errorsToShowOnUI.push(`${new Date()} -- No follow button found for user ${user} and link ${link}. Skipping.`);
        return;
      }
      dropdownArrow.click();
      await nap(500);
      logsOn && console.debug(`${now()} -- 2. Clicking on FOLLOW for user ${user}`);
      const followBtn = w.document.getElementsByClassName('button slim hollow secondary ')[0];
      if (followBtn.innerText.toUpperCase() === 'FOLLOW') {
        followBtn.click();
        await nap(5000);
        if(followBtn.innerText.toUpperCase() !== 'UNFOLLOW') {
          const msg = `(maybe) was not able to follow ${user}`;
          warnings.push(msg);
          logsOn && console.debug(msg);
        }
      }
    }

    logsOn && console.debug('Resteeming post for user', user);
    const resteemBtn = w.document.querySelectorAll('a[title=Resteem]')[0]
    if (!resteemBtn) {
      errorsToShowOnUI.push(`${new Date()} -- Resteem button not found for user ${user} and link ${link}. Post may be expired.`);
      return;
    }
    resteemBtn.click();
    await nap(500);
    logsOn && console.debug('Confirming Resteem..');
    const confirmForm = w.document.getElementsByClassName('ConfirmTransactionForm')[0]
    if(confirmForm) {
      confirmForm.getElementsByTagName('button')[0].click();
      await nap(3000);
    }
    const resteemOk = w.document.getElementsByClassName('Reblog__button Reblog__button-active')[0];
    if(resteemOk && confirmForm) {
      logsOn && console.debug('==> SUCCESS.');
      if (resteemedLinksOnThisPost.indexOf(link) == -1) {
        resteemedLinksOnThisPost.push(link);
        resteemsCount++;
      }
    } else if (resteemOk && !confirmForm) {
      logsOn && console.error(`${new Date()} -- Post Was already resteemed. User: ${user}`);
    } else {
      const msg = `FAILED? Grey Resteem for ${user} -> ${link}`;
      logsOn && console.debug(msg);
      if (resteemedLinksOnThisPost.indexOf(link) == -1) {
        resteemedLinksOnThisPost.push(link);
        resteemsCount++;
      }
    }
  } catch(err) {
    const msg = `${new Date()} -- Something went wrong processing post for user ${user}. Error: ${err}`;
    logsOn && console.error(msg);
    errorsToShowOnUI.push(msg);
  } finally {
    w && w.close();
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
    logsOn && console.debug('Building the UI ..');
    divToAdd = document.createElement('div');
    divToAdd.id = 'injected-ui';
    divToAdd.style.padding = '20px'
    divToAdd.style['background-color'] = '#333333';
  } else {
    logsOn && console.debug('Refreshing the UI ..');
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
    logsOn && console.debug('UI created. Now getting rid of some outdated steemit content..');
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
    logsOn && console.debug('UI refreshed');
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
  setTimeout(() => processUsersComments(), 5000); // let the UI build first
  setTimeout(() => processUsersComments(), 10 * 60 * 1000);
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
  ACCOUNT_NAME = 'YOUR_ACCOUNT_NAME_HERE'; // NO Edge..
  start();
`;
