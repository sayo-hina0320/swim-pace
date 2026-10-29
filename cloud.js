const appUI=window.swimApp,login=document.querySelector('#login'),logout=document.querySelector('#logout');
login.disabled=true;logout.disabled=true;
try{
 const {firebaseConfig,adminEmail,boardPath}=await import('./firebase-config.js');
 if(!firebaseConfig.projectId||!firebaseConfig.apiKey||!adminEmail)throw Error('missing-config');
 const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut},{getFirestore,doc,onSnapshot,runTransaction,serverTimestamp}]=await Promise.all([
 import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
 import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js'),
 import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js')]);
 const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),ref=doc(db,boardPath);
 let currentUser=null,stopped=false;
 getRedirectResult(auth).catch(()=>{appUI.setConnection('ログイン結果を取得できませんでした。SafariまたはChromeで開き直してください。')});
 function reconnect(){stopped=false;appUI.setConnection('共有データに接続中…');return onSnapshot(ref,{includeMetadataChanges:true},snapshot=>{if(snapshot.metadata.fromCache){appUI.setConnection('接続を確認中…（最新データ未確認）');return}try{const data=snapshot.exists()?snapshot.data():{rows:[],revision:0};if(!Number.isInteger(data.revision)||data.revision<0)throw Error('invalid-revision');appUI.setBoard(data.rows,data.revision,snapshot.exists(),data.menus??null)}catch{appUI.setConnection('共有データの形式が正しくありません。管理者へ連絡してください。')}},error=>{stopped=true;appUI.setConnection(error.code==='permission-denied'?'共有データの閲覧権限を確認してください。':'共有データに接続できません。再読み込みしてください。')})}
 let unsubscribe=reconnect();
 onAuthStateChanged(auth,user=>{currentUser=user;const isAdmin=!!user&&user.emailVerified&&user.email?.toLowerCase()===adminEmail.toLowerCase();appUI.setAuth(user?{uid:user.uid}:null,isAdmin);login.disabled=false;logout.disabled=false;if(stopped){unsubscribe();unsubscribe=reconnect()}});
 login.onclick=async()=>{const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});try{await signInWithPopup(auth,provider)}catch(error){if(error.code==='auth/popup-blocked'){try{await signInWithRedirect(auth,provider);return}catch{alert('ログイン画面を開けませんでした。SafariまたはChromeで開き直してください。');return}}const message=error.code==='auth/unauthorized-domain'?'管理者ログイン用ドメインが未設定です。Firebase Authenticationの承認済みドメインを確認してください。':error.code==='auth/popup-blocked'?'ポップアップがブロックされました。SafariまたはChromeで開き直してください。':error.code==='auth/popup-closed-by-user'?'ログインをキャンセルしました。':'ログインできませんでした。SafariまたはChromeで再試行してください。';alert(message)}};
 logout.onclick=async()=>{try{await signOut(auth)}catch{alert('ログアウトできませんでした。再試行してください。')}};
 appUI.setSave(async(rows,expectedRevision,menus)=>{if(!currentUser?.emailVerified||currentUser.email?.toLowerCase()!==adminEmail.toLowerCase())throw Error('not-admin');if(!appUI.valid(rows)||!appUI.validMenus(menus))throw Error('invalid-data');await runTransaction(db,async transaction=>{const snapshot=await transaction.get(ref),previous=snapshot.exists()?snapshot.data().revision:0;if(previous!==expectedRevision){const error=Error('conflict');error.code='conflict';throw error}transaction.set(ref,{...(snapshot.exists()?snapshot.data():{}),rows,menus,revision:previous+1,updatedAt:serverTimestamp()})})});
}catch{appUI.setConnection('Firebaseへ接続できません。接続設定とネットワークを確認して再読み込みしてください。');login.disabled=true;logout.disabled=true}
