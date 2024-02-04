import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { getEventHash, getSignature, nip19, SimplePool } from 'nostr-tools';
import UploadAndDisplayImage from './UploadUserPicture';
import { getProfileFromPublicKey } from '../Profile';

function UserDetailsForAccountCreation({ isOpen, onClose, sk, pk }) {
    const [username, setUsername] = useState('');
    const [aboutMe, setAboutMe] = useState('');
    const [fileString, setFileString] = useState('');

    const choosePicture = url => {
        setFileString(url);
    };

    function handleUsernameChange(event) {
        setUsername(event.target.value);
    }

    async function registerAccount(sk, pk) {
        const relays = [
            'wss://relay.damus.io',
            'wss://relay.primal.net',
            'wss://relay.snort.social',
            'wss://relay.hllo.live',
        ];

        const pool = new SimplePool();
        const encodedSk = sk;
        sk = nip19.decode(sk);
        pk = nip19.decode(pk);

        const content = {
            name: username,
            about: aboutMe,
        };

        if (fileString.length > 0) {
            content.picture = fileString;
        }

        const userRegisterEvent = {
            kind: 0,
            pubkey: pk.data,
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ['p', pk.data],
                ['w', 'memestrAccount'],
            ],
            content: JSON.stringify(content),
        };

        userRegisterEvent.id = getEventHash(userRegisterEvent);
        userRegisterEvent.sig = getSignature(userRegisterEvent, sk.data);

        try {
            await pool.publish(relays, userRegisterEvent);

            pool.close(relays);

            const profile = await getProfileFromPublicKey(pk.data);
            let details = JSON.parse(profile.content);
            details.pubKey = pk.data;
            details.privateKey = encodedSk; // Encrypt it.
            localStorage.setItem('memestr', JSON.stringify(details));
            console.log('Set the default login in local cache.', details);
        } catch (error) {
            console.error('Error during registration:', error);
        }
    }

    // async function registerAccount(sk, pk) {
    //     let relays = [
    //         'wss://relay.damus.io',
    //         'wss://relay.primal.net',
    //         'wss://nos.lol',
    //         'wss://nostr.bitcoiner.social',
    //     ];
    //     const pool = new SimplePool();
    //     let encodedPubKey = pk
    //     sk = nip19.decode(sk);
    //     pk = nip19.decode(pk);
    //     console.log('sk pk is', sk, pk);
    //     let content = {
    //         name: username,
    //         about: aboutMe,
    //     };
    //
    //     if (fileString.length > 0) {
    //         content['picture'] = fileString;
    //     }
    //     content = JSON.stringify(content);
    //     let userRegisterEvent = {
    //         kind: 0,
    //         pubkey: pk.data,
    //         created_at: Math.floor(Date.now() / 1000),
    //         tags: [
    //             ['p', pk.data],
    //             ['w', 'memestrAccount'],
    //         ],
    //         content: content,
    //     };
    //
    //     userRegisterEvent.id = getEventHash(userRegisterEvent);
    //
    //     userRegisterEvent.sig = getSignature(userRegisterEvent, sk.data);
    //     let x = await pool.publish(relays, userRegisterEvent);
    //     console.log('userRegistration Event', userRegisterEvent);
    //     console.log('o=o=o', x);
    //
    //     pool.close(relays);
    //     let userDetails = getUserDetailsFromPrivateKey(privateKey, false);
    //     userDetails.then(value => {
    //         value['pubKey'] = encodedPubKey;
    //         value['privateKey'] = sk; //Encrypt it.
    //         localStorage.setItem('memestr', JSON.stringify(value));
    //         console.log('Set the default login in local cache.', loggedInUserDetails);
    //     }
    // }

    function handleAboutMeChange(event) {
        setAboutMe(event.target.value);
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-full p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="text-center">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900">
                                        Create Your Account
                                    </Dialog.Title>
                                    <p className="text-sm text-gray-500">
                                        Join the world of memes!
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <label
                                        htmlFor="username"
                                        className="block text-sm font-medium text-gray-700 py-2">
                                        Username:
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border rounded-lg bg-gray-50  text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Username"
                                        value={username}
                                        onChange={handleUsernameChange}
                                    />
                                </div>

                                <div className="mt-4">
                                    <label
                                        htmlFor="aboutMe"
                                        className="block text-sm font-medium text-gray-700 py-2">
                                        About Me:
                                    </label>
                                    <textarea
                                        className="w-full px-4 py-2 border rounded-lg  bg-gray-50 text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                                        rows="3"
                                        placeholder="Tell us about yourself"
                                        value={aboutMe}
                                        onChange={
                                            handleAboutMeChange
                                        }></textarea>
                                </div>

                                <div className="mt-4 ">
                                    <label
                                        htmlFor="imageUpload"
                                        className="block text-sm font-medium text-gray-700">
                                        Profile Picture:
                                    </label>
                                    <UploadAndDisplayImage
                                        setPicture={choosePicture}
                                    />
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-gradient-to-r from-blue-500 to-teal-500 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none"
                                        onClick={async () => {
                                            await registerAccount(sk, pk);
                                            onClose();
                                        }}>
                                        Create Account and Login
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
export default UserDetailsForAccountCreation;
