// Text of the Privacy Policy and the Terms & Conditions shown on the Profile tab.
// A section is { h: heading, p: [paragraphs], ul: [bullets], after: [paragraphs after the list] }.
// Keep it in step with what the app really does (see supabase/README.md): if sync,
// sign-in or data handling changes, update this text and the date below.

export const CONTACT_EMAIL = 'omerkaballo04@gmail.com'
export const LEGAL_UPDATED = 'October 31, 2026'
export const SITE_URL = 'https://okaballo.github.io/calorie-app/'

export const PRIVACY = {
  title: 'Privacy Policy',
  intro: [
    'KiBase is built to keep your data on your own device. This policy explains what KiBase stores, what happens when you choose to turn on Cloud Sync, and the choices you have.',
  ],
  sections: [
    {
      h: 'The short version',
      ul: [
        'Your meals, weight, workouts and settings are saved on your device and work without an internet connection.',
        'Cloud Sync is optional. If you never turn it on, nothing you enter is sent to us.',
        'You sign in only with Google or Apple. KiBase never asks for or stores a password.',
        'No ads, no analytics, no tracking, and we never sell your data.',
        'You can export your data, and you can ask us to delete your cloud data at any time.',
      ],
    },
    {
      h: 'Who we are',
      p: [
        `KiBase (“KiBase”, “We”, “Us”, “Our”) is a calorie, macro and workout tracking app that runs in your browser or as an installed web app at ${SITE_URL}. We are based in Egypt. “You” means the person using the app.`,
      ],
    },
    {
      h: 'Information we handle',
      p: ['On your device (always). KiBase saves what you enter in your browser’s local storage on your device:'],
      ul: [
        'Your profile: name, age, body measurements, goals and photo (if you add one)',
        'Your meals and foods, including the foods and meals you create',
        'Your weight entries, workouts, routines and exercise history',
        'Your settings, such as theme and language',
      ],
      after: [
        'This information stays on your device. It leaves your device only if you turn on Cloud Sync or you export a backup file yourself.',
        'Food, weight and exercise details can reveal things about your health. We treat them as sensitive and use them only to run the features you ask for.',
      ],
    },
    {
      h: 'Cloud Sync (optional)',
      p: ['If you turn on Cloud Sync, you sign in with Google or Apple. We then handle:'],
      ul: [
        'Your name and email address, as shared by Google or Apple (Apple lets you hide your real email). These are kept by our authentication provider.',
        'A copy of the KiBase data listed above, stored in your private space in our cloud database so it can be backed up and shared between your devices.',
        'A sign-in session token, saved on your device so you stay signed in.',
      ],
      after: [
        'Your cloud data is protected so that only your own account can read or change it. We do not read your entries, and we do not use them for any purpose other than backup and sync.',
        'You can sign out at any time. Signing out keeps the data on your device and stops syncing.',
      ],
    },
    {
      h: 'What we do not collect',
      ul: [
        'Passwords (sign-in is handled by Google or Apple)',
        'Your location, contacts, camera or microphone data',
        'Payment details (KiBase is free and has no purchases)',
        'Advertising identifiers or analytics about how you use the app',
      ],
      after: [
        'The photo you choose for your profile is resized and stored on your device (and synced only if Cloud Sync is on). KiBase does not upload it anywhere else.',
      ],
    },
    {
      h: 'Local storage, cookies and offline files',
      p: [
        'KiBase does not use advertising or tracking cookies. To work offline it uses your browser’s local storage (for your data and sign-in session) and a service worker cache (for the app files). These are essential to how the app works. You can remove them at any time by clearing the site’s data in your browser, which also deletes the data stored on your device, so export a backup first.',
      ],
    },
    {
      h: 'How we use information',
      ul: [
        'To provide the app and its features on your device',
        'To sign you in and to back up and sync your data when you turn on Cloud Sync',
        'To keep the service secure and prevent abuse',
        'To answer your questions and requests',
      ],
      after: ['We do not use your information for advertising, profiling or marketing, and we do not sell or rent it.'],
    },
    {
      h: 'Who we share it with',
      p: ['We share information only with the providers that make KiBase work, and only for that purpose:'],
      ul: [
        'Supabase, which provides our sign-in and cloud database (only when you use Cloud Sync).',
        'Google or Apple, when you choose to sign in with them. They receive your sign-in request under their own privacy policies.',
        'GitHub, which hosts the app’s files. Like any web host, it may log technical details such as your IP address when the app loads. We do not receive or analyze these logs.',
      ],
      after: [
        'We may also disclose information if the law requires it, to protect rights, safety or security, or as part of a business transfer such as a merger, in which case we will tell you first. We do not share your data with anyone else.',
      ],
    },
    {
      h: 'Your consent',
      p: [
        'Cloud Sync is your choice. By turning it on and signing in, you agree to the handling described above. You can withdraw this at any time by signing out and asking us to delete your cloud data. Withdrawing does not affect what was done before.',
      ],
    },
    {
      h: 'How long we keep it',
      ul: [
        'On your device: until you delete it in the app, clear the site’s data, or remove the app.',
        'In the cloud: until you ask us to delete it or your account is removed. Items you delete in the app are marked as deleted in the cloud so your other devices can remove them too; these small markers are removed together with your account.',
        'Our providers may keep short-lived technical backups after deletion, which are not restored except for security or disaster recovery.',
      ],
    },
    {
      h: 'Your choices and rights',
      ul: [
        'Access and portability: use Backup & Restore on the Profile tab to export all your data as a file.',
        'Correction: edit or remove your entries in the app at any time.',
        'Deletion: delete entries in the app, or email us to delete your account and all your cloud data. We will do this within a reasonable time, normally within 30 days.',
        'Stop syncing: sign out from the Cloud Sync card.',
      ],
      after: ['Depending on where you live, you may have further rights under your local law. Contact us and we will help.'],
    },
    {
      h: 'International transfers',
      p: [
        'Our providers may process data in countries other than yours, whose data protection laws may differ. Where required, we rely on appropriate safeguards so that your data is treated securely and as described in this policy.',
      ],
    },
    {
      h: 'Security',
      p: [
        'Data sent to the cloud travels over encrypted connections, and each account can reach only its own rows in the database. Still, no method of transmission or storage is 100% secure, so we cannot guarantee absolute security. Keep your device and your Google or Apple account secure.',
      ],
    },
    {
      h: 'Children',
      p: [
        'KiBase is not directed to anyone under 16 and we do not knowingly collect personal information from them. If you believe a child has given us information, contact us and we will delete it.',
      ],
    },
    {
      h: 'Links to other websites',
      p: ['KiBase may link to sites we do not run. We are not responsible for their content or privacy practices, so please read their policies.'],
    },
    {
      h: 'Changes to this policy',
      p: [
        'We may update this policy from time to time. The new version will be posted in the app with a new “Last updated” date. If a change is significant, we will show a notice in the app before it takes effect.',
      ],
    },
    {
      h: 'Contact us',
      p: ['Questions or requests about privacy? Email us:'],
      email: true,
    },
  ],
}

export const TERMS = {
  title: 'Terms & Conditions',
  intro: [
    'Please read these terms before using KiBase. By using the app you agree to them. If you do not agree, please do not use KiBase.',
  ],
  sections: [
    {
      h: 'The service',
      p: [
        `KiBase is a free calorie, macro, weight and workout tracker at ${SITE_URL}. It stores your data on your device and, if you choose, backs it up and syncs it to your account (Cloud Sync). We may change, add or remove features at any time.`,
      ],
    },
    {
      h: 'Not medical advice',
      p: [
        'KiBase is for general information and personal tracking only. Calorie targets, macros, calculators and nutrition values are estimates and are not medical, nutritional or fitness advice. Talk to a qualified professional before changing your diet or starting an exercise program, especially if you have a health condition, are pregnant, or are under 18. Stop exercising and seek help if you feel unwell. You use KiBase at your own risk.',
      ],
    },
    {
      h: 'Who can use it',
      p: ['You must be at least 16 years old. If local law sets a higher age for using an online service, you must meet that age or have a parent or guardian’s permission.'],
    },
    {
      h: 'Your account',
      p: [
        'Cloud Sync uses sign-in with Google or Apple. You are responsible for your Google or Apple account, your device, and everything done through them. Tell us promptly if you think someone has accessed your account. We may suspend or remove access to Cloud Sync if these terms are broken or to protect the service.',
      ],
    },
    {
      h: 'Your data',
      ul: [
        'What you enter is yours. We do not claim ownership of it.',
        'You allow us to store, copy and sync it only as needed to run the features you use, as described in our Privacy Policy.',
        'Data kept only on your device can be lost if you clear your browser data, change phones or remove the app. Cloud Sync helps, but you are responsible for your own backups. Use Backup & Restore on the Profile tab regularly.',
      ],
    },
    {
      h: 'Food and nutrition information',
      p: [
        'Food values in KiBase come from general sources, brands’ published information and estimates. They can be incomplete or differ from the product you eat. Check labels where accuracy matters. Names and logos of brands and restaurants belong to their owners; their appearance in KiBase does not mean they endorse or are connected with us.',
      ],
    },
    {
      h: 'Acceptable use',
      p: ['You agree not to:'],
      ul: [
        'Break the law or infringe anyone’s rights while using KiBase',
        'Try to access other people’s data, or probe, attack or overload our systems',
        'Reverse engineer, scrape or copy the service in a way the law does not allow',
        'Use the service to harm, harass or mislead others',
      ],
    },
    {
      h: 'Ownership',
      p: [
        'The KiBase app, its design, name, logo and code belong to us or our licensors and are protected by law. We give you a personal, non-exclusive, non-transferable right to use the app for your own use. Apple, Google and other third-party names and marks belong to their owners.',
      ],
    },
    {
      h: 'Availability and ending use',
      p: [
        'We work to keep KiBase available but do not promise it will always be uninterrupted or error-free. Cloud Sync depends on third-party services. You can stop using KiBase at any time. You can ask us to delete your cloud data, as explained in the Privacy Policy. We may suspend or end the service, or your access, if needed.',
      ],
    },
    {
      h: 'No warranty',
      p: [
        'KiBase is provided “as is” and “as available”, without warranties of any kind, to the fullest extent the law allows. We do not promise that the app, its nutrition values or its calculations are accurate, complete or suitable for your needs.',
      ],
    },
    {
      h: 'Limit of liability',
      p: [
        'To the fullest extent the law allows, we are not liable for indirect or consequential losses, lost data, or any harm that results from using or being unable to use KiBase, including decisions made about your diet, exercise or health. Nothing in these terms limits liability that cannot be limited by law.',
      ],
    },
    {
      h: 'Changes to these terms',
      p: [
        'We may update these terms. The new version will be posted in the app with a new “Last updated” date, and continuing to use KiBase after that means you accept it. If a change is significant, we will show a notice in the app.',
      ],
    },
    {
      h: 'Governing law',
      p: ['These terms are governed by the laws of Egypt. Any dispute will be handled by the competent courts of Egypt, unless the law where you live gives you rights that cannot be waived.'],
    },
    {
      h: 'Contact us',
      p: ['Questions about these terms? Email us:'],
      email: true,
    },
  ],
}
