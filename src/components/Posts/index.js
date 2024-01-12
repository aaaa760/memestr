import { getEventHash, getSignature, nip19, SimplePool } from 'nostr-tools';
import { fetchInvoice, getProfileMetadata, getZapEndpoint } from '../ZapHelper';
import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import ZapModal from '../ZapHelper/ZapModal';
import { ShareModal } from '../Share/modal';
import { ReactComponent as ShareButtonSvg } from '../../Icons/ShareButtonSvg.svg';
import { ReactComponent as LikeSvg } from '../../Icons/LikeSvg.svg';
import { ReactComponent as ZapSvg } from '../../Icons/Zap.svg';
import { ReactComponent as CommentSvg } from '../../Icons/CommentSvg.svg';
import { getCommentCount } from '../HashtagTool';
import { useAuth } from '../../AuthContext';
import { VideoPlayer } from '../../helpers/videoPlayer';
const MAX_POSTS = 200;
const manageLikedPosts = (postId, userPublicKey, isLiked) => {
    let likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || {};

    if (!likedPosts[postId]) {
        likedPosts[postId] = {};
    }
    likedPosts[postId][userPublicKey] = isLiked;

    let postIds = Object.keys(likedPosts);
    if (postIds.length > MAX_POSTS) {
        delete likedPosts[postIds[0]];
    }

    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
};

export function extractLinksFromText(text) {
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const jpgRegex = /\.(jpg|jpeg)$/i;
    const mp4Regex = /\.mp4$/i;
    const gifRegex = /\.gif$/i;
    const links = text.match(linkRegex);
    if (!links) {
        return [];
    }

    return links
        .map(link => {
            try {
                const url = new URL(link);
                // Remove the fragment identifier
                url.hash = '';
                return url.toString();
            } catch (error) {
                // Handle invalid URLs
                console.error(`Error parsing URL: ${link}`);
                return null;
            }
        })
        .filter(link => link !== null)
        .filter(
            link =>
                jpgRegex.test(link) ||
                mp4Regex.test(link) ||
                gifRegex.test(link),
        );
    // return links.filter(
    //     link =>
    //         jpgRegex.test(link) || mp4Regex.test(link) || gifRegex.test(link) || link.includes("#"),
    // );
}

export const removeHashtagsAndLinks = text => {
    // Remove hashtags
    // const withoutHashtags = text.replace(/#\w+/g, '');
    // Remove links
    return text.replace(/(https?:\/\/[^\s]+)/g, '');
};

export async function upvotePost(noteId, userPublicKey) {
    const storedData = localStorage.getItem('memestr');

    if (!storedData) {
        alert('Login required to upvote.');
        return false;
    }

    const userData = JSON.parse(storedData);
    userPublicKey = userData.pubKey;

    if (!userPublicKey) {
        alert('Invalid user data.');
        return false;
    }
    let likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || {};
    if (likedPosts[noteId] && likedPosts[noteId][userPublicKey]) {
        alert('Already liked this post');
        return false;
    }
    try {
        let sk = nip19.decode(userData.privateKey);

        const pool = new SimplePool();
        let relays = ['wss://relay.damus.io', 'wss://relay.primal.net'];

        let upvoteEvent = {
            kind: 7,
            pubkey: userPublicKey,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['e', noteId],
                ['p', userPublicKey],
            ],
            content: '+',
        };
        upvoteEvent.id = getEventHash(upvoteEvent);
        upvoteEvent.sig = getSignature(upvoteEvent, sk.data);
        await pool.publish(relays, upvoteEvent);
        manageLikedPosts(noteId, userPublicKey, true);

        pool.close(relays);
        return true;
    } catch (error) {
        console.error('Error publishing upvote event:', error);
        return false;
    }
}

export const sendNewZaps = async (postId, opPubKey, sats = 11) => {
    console.log('Sending zaps');
    const pubKey = opPubKey;
    let relays = [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nos.lol',
        'wss://nostr.bitcoiner.social',
    ];
    const encodedNoteId = nip19.noteEncode(postId);
    let userDetails = await getProfileMetadata(pubKey);
    let zapEndpoint = await getZapEndpoint(userDetails);
    let invoice = await fetchInvoice({
        zapEndpoint: zapEndpoint,
        amount: sats * 1000,
        comment: 'You got zapped!',
        authorId: pubKey,
        noteId: encodedNoteId,
        normalizedRelays: relays,
    });
    let zapUrl = 'lightning:' + invoice;
    window.location.assign(zapUrl);
};

export const saveComment = (postId, comment) => {
    let relays = [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nos.lol',
        'wss://nostr.bitcoiner.social',
    ];
    const pool = new SimplePool();
    const storedData = localStorage.getItem('memestr');
    if (!storedData) {
        alert('Login required to upvote.');
        return;
    }
    let uesrPublicKey = JSON.parse(storedData).pubKey;
    let userPrivateKey = JSON.parse(storedData).privateKey;
    let sk = nip19.decode(userPrivateKey);
    let commentEvent = {
        kind: 1,
        pubkey: uesrPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ['e', postId],
            ['p', uesrPublicKey],
            ['alt', 'reply'],
        ],
        content: comment,
    };

    commentEvent.id = getEventHash(commentEvent);
    commentEvent.sig = getSignature(commentEvent, sk.data);
    pool.publish(relays, commentEvent);
    pool.close(relays);
};

export function calculateTimeDifference(postCreatedAt) {
    const currentTime = Math.floor(Date.now() / 1000); // Convert milliseconds to seconds
    const secondsDifference = currentTime - postCreatedAt;
    let unit = '';
    let duration = 0;
    if (secondsDifference < 60) {
        unit = 'seconds';
        duration = secondsDifference;
    } else if (secondsDifference < 3600) {
        unit = 'm';
        duration = Math.floor(secondsDifference / 60);
    } else if (secondsDifference < 86400) {
        unit = 'h';
        duration = Math.floor(secondsDifference / 3600);
    } else {
        unit = 'd';
        duration = Math.floor(secondsDifference / 86400);
    }
    return { unit, duration };
}

function Posts(props) {
    const mediaLinks = extractLinksFromText(props.note.content);
    const [votesCount, setVotesCount] = useState(0);
    const [commentCount, setCommentCount] = useState(
        sessionStorage.getItem('cc_' + props.note.id),
    );
    const [fillLike, setFillLike] = useState(false);
    const [fillZap, setFillZap] = useState(false);
    const [timeDifference, setTimeDifference] = useState({
        unit: '',
        duration: 0,
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [processedValue, setProcessedValue] = useState(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const { isLoggedIn } = useAuth();
    const [userPublicKey, setUserPublicKey] = useState(null);

    useEffect(() => {
        const storedData = localStorage.getItem('memestr');
        const userData = storedData ? JSON.parse(storedData) : null;
        setUserPublicKey(userData?.pubKey);

        if (!isLoggedIn) {
            setFillLike(false);
        } else {
            let likedPosts =
                JSON.parse(localStorage.getItem('likedPosts')) || {};
            setFillLike(
                !!(
                    likedPosts[props.note.id] &&
                    likedPosts[props.note.id][userPublicKey]
                ),
            );
        }
    }, [isLoggedIn, props.note.id, userPublicKey]);

    let postCreatedAt = props.note.created_at;

    const openModal = () => {
        setIsModalOpen(true);
    };

    const openShareModal = () => {
        setIsShareModalOpen(true);
    };

    const closeShareModal = () => {
        setIsShareModalOpen(false);
    };

    const handleConfirm = value => {
        const postId = props.note.id;
        let opPubKey = props.note.pubkey;
        console.log(`Processing value: ${value}`);

        sendNewZaps(postId, opPubKey, value);
        setProcessedValue(value);
    };

    useEffect(() => {
        let { unit, duration } = calculateTimeDifference(postCreatedAt);
        if (duration !== 0) {
            setTimeDifference({ unit: unit, duration: duration });
        }
    }, [postCreatedAt]);

    useEffect(() => {
        setVotesCount(props.note.voteCount);

        (async () => {
            try {
                var cc = await getCommentCount(props.note.id);
                setCommentCount(cc);
            } catch (error) {
                console.error('Error fetching comments count:', error);
            }
        })();
    }, [props.note.voteCount, props.note.id]);

    useEffect(() => {
        const userPublicKey = JSON.parse(
            localStorage.getItem('memestr'),
        )?.pubKey;
        let likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || {};
        setFillLike(
            !!(
                likedPosts[props.note.id] &&
                likedPosts[props.note.id][userPublicKey]
            ),
        );
    }, [props.note.id]);

    useEffect(() => {
        const updateVotesCount = () => {
            let likedPosts =
                JSON.parse(localStorage.getItem('likedPosts')) || {};
            if (likedPosts[props.note.id]) {
                const count = Object.keys(likedPosts[props.note.id]).length;
                setVotesCount(count);
            }
        };
        updateVotesCount();
    }, [props.note.id]);

    let title = removeHashtagsAndLinks(props.note.content)
        .trimLeft()
        .trimRight();
    if (title.length === 0) {
        title = ' ';
    }
    const imageLink = mediaLinks[0];

    function voteIncrement(postId) {
        setVotesCount(prevCount => prevCount + 1);
        fillColor(postId);
        manageLikedPosts(postId, true);
    }

    function fillColor(postId) {
        let likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || {};
        if (likedPosts[postId]) {
            setFillLike(true);
        } else {
            setFillLike(false);
        }
    }

    function isTodisabled() {
        const userPublicKey = JSON.parse(
            localStorage.getItem('memestr'),
        )?.pubKey;
        let likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || {};
        return !!(
            likedPosts[props.note.id] &&
            likedPosts[props.note.id][userPublicKey]
        );
    }

    function handleZapButton() {
        const storedData = localStorage.getItem('memestr');
        if (!storedData) {
            alert('Login to send zaps.');
            return false;
        }
        openModal();
        setFillZap(true);
    }

    function truncateTitle(title, maxLength) {
        if (title.length > maxLength) {
            return title.substring(0, maxLength) + '...';
        } else {
            return title;
        }
    }

    function renderContent(imageLink) {
        try {
            const extension = imageLink.split('.').pop();
            if (extension === 'undefined') {
                return;
            }
            if (['jpg', 'jpeg', 'gif', 'png'].includes(extension)) {
                return (
                    <img
                        alt={''}
                        src={imageLink}
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            objectFit: 'cover',
                        }}
                    />
                );
            } else {
                return <VideoPlayer imageLink={imageLink} />;
            }
        } catch (e) {
            console.log('Image link is ', imageLink);
            console.log('Something happened here' + e);
        }
    }

    const handleLikeButtonClick = () => {
        if (!isLoggedIn) {
            alert('Login required to upvote.');
            return;
        }
        upvotePost(props.note.id, userPublicKey).then(wasLiked => {
            if (wasLiked) {
                voteIncrement(props.note.id);
            }
        });
    };

    let postUrl = `/post/${props.note.id}?voteCount=${votesCount}`;
    return (
        <>
            <div className="flex flex-col items-center">
                <div className="bg-white mt-4  overflow-hidden rounded-sm w-full max-w-md">
                    {/* Post Header: Title and Time */}
                    <div className="py-2 px-1 pb-1 border-t border-x border-gray-300 rounded-t-md">
                        <div className="flex justify-between items-center">
                            <h3 className="text-md font-nunito">
                                {truncateTitle(title, 70)}
                            </h3>
                            <span className="text-xs text-gray-500">
                                {timeDifference.duration}
                                {timeDifference.unit}
                            </span>
                        </div>
                    </div>

                    {/* Post Media Content */}

                    <div className="h-svh lg:px-1 px-4 bg-gray-200 border border-gray-300">
                        {renderContent(imageLink)}
                    </div>

                    <div className="border-x border-grey-100 flex flex-col p-3">
                        <div className="flex justify-between items-centre">
                            <Link to={postUrl} className="flex items-center ">
                                <CommentSvg className="h-4 w-4 text-black-600" />
                                <span className="text-xs text-gray-600 ml-1">
                                    {commentCount > 0 ? commentCount : ''}
                                </span>
                            </Link>

                            <button
                                onClick={handleZapButton}
                                className={`flex items-center ${
                                    fillZap
                                        ? 'text-yellow-300'
                                        : 'text-black-600'
                                }`}>
                                <ZapSvg className="h-4 w-4 text-black-600" />
                                {processedValue && (
                                    <span className="text-xs ml-1">
                                        {processedValue}
                                    </span>
                                )}
                                <ZapModal
                                    isOpenm={isModalOpen}
                                    onConfirm={handleConfirm}
                                />
                            </button>

                            <button
                                onClick={handleLikeButtonClick}
                                disabled={isTodisabled()}
                                className={`flex items-center ${
                                    fillLike ? 'text-red-600' : 'text-black-600'
                                }`}>
                                <LikeSvg
                                    fill={fillLike ? 'red' : 'none'}
                                    className="h-4 w-4"
                                />
                                <span className="text-xs ml-1 text-black-600">
                                    {votesCount}
                                </span>
                            </button>

                            <button onClick={openShareModal} className="p-1">
                                <ShareButtonSvg className="h-4 w-4 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-grey-100 rounded-b-md "></div>
                </div>
            </div>

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={closeShareModal}
                postUrl={postUrl}
            />
        </>
    );
}

export default Posts;
