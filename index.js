//impot the ethers.js stuff
import { ethers } from "./ethers-5.2.esm.min.js";

// rename the solidity json file to .js and add 'export default' to the top line
import myEpicGame from './MyEpicGame.js';
// alternatively, 'import assertion' works in chrome, but it's not ready on firefox yet.

//bring in our contract address and that transform method
import {CONTRACT_ADDRESS, transformCharacterData, transformBossData} from "./utils.js";

var gameContract;

const App = {
    data() {
      return {
        currentSection: 'login',
        CONTRACT_ADDRESS: null,
        characters: null,
        currentAccount: null,
        characterNFT: null,
        boss: null,
        shouldListenForAttack: true,
        shouldListenForHeals: true,
        shouldListenForMint: true
      }
    },
    mounted(){
        this.isLoaded();
        this.runLogic();
    },
    methods: {
        isLoaded(){
            console.log('This is a Vue 3.x implementation of the nft-game-starter project.');  
        },
        async connectWallet(){
            try{
                if(this.currentAccount != null) return;
                
                const {ethereum} = window;
          
                if(!ethereum){
                  alert('GetMetamask');
                  return;
                }
          
                const accounts = await ethereum.request({
                  method: 'eth_requestAccounts'
                });
          
                console.log('Connected', accounts[0]);
                this.currentAccount = accounts[0];
                this.runLogic();
            }catch(error){
                console.log(error);
            }            
        },
        runLogic() {
            this.checkforWallet().then(()=>{
                this.showSwal('loading..');
        
                //if not authenticated, show login button
                if(this.currentAccount == null) this.currentSection = 'login';
                
                //if authenticated, check for existing NFT and..
                if(this.currentAccount != null) this.fetchNFTMeta().then(()=> { 
                    //exit if error with contract
                    if(gameContract == null) return;
        
                    //get all the NFT characters
                    if(gameContract != null){ 
                        if(this.characters == null) this.getCharacters();
                        if(this.boss == null) this.fetchBoss(); 
                    }; 
        
                    //If no character minted, show mint screen
                    if(this.characterNFT == null){ this.currentSection = 'mint' };
        
                    //If character exists, show fight arena
                    if(this.characterNFT != null){ this.currentSection = 'arena' }; 
                });
        
                this.hideSwal();
            });     
        },
        showSwal(msg){
            Swal.fire({
                title: msg,
                imageUrl: 'loading.gif',
                        imageWidth: 384,
                        imageHeight: 215,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false
              })    
        },
        hideSwal() {
            Swal.close();
        },
        onResetHealth(newBossHp, newPlayerHp){
            if(this.shouldListenForHeals){
                this.shouldListenForHeals = false;
            }else{
                return;
            };
        
            this.hideSwal();
            const bossHp = newBossHp.toNumber();
            const playerHp = newPlayerHp.toNumber();
            this.boss.hp = bossHp;
            this.characterNFT.hp = playerHp;
            
            console.log(`Healths reset.. ${newBossHp} and ${newPlayerHp}`);      
        },
        async ResetHealth(){
            try{
                this.shouldListenForHeals = true;
                const txn = await gameContract.resetHealth();
                console.log('Resetting Health:', txn);
                this.showSwal('Resetting Health...');
            }catch (error){
                this.shouldListenForHeals = false;
                this.hideSwal();
                console.log(error);
            }
        },
        AttackComplete(newBossHp, newPlayerHp){
            if(this.shouldListenForAttack){
                this.shouldListenForAttack = false;
            }else{
                return;
            };
        
            this.hideSwal();
            const bossHp = newBossHp.toNumber();
            const playerHp = newPlayerHp.toNumber();
        
            Swal.fire(
                'Good job!',
                `AttackComplete: Boss Hp: ${bossHp} Player Hp: ${playerHp}`,
                'success'
              )
            console.log(`AttackComplete: Boss Hp: ${bossHp} Player Hp: ${playerHp}`);
        
            this.boss.hp = bossHp;
            this.characterNFT.hp = playerHp;
        },
        async runAttackAction(){
            try {
              if (gameContract) {
                this.shouldListenForAttack = true;
                this.showSwal('Attacking that sumbich!');  
                console.log('Attacking boss...');
                const attackTxn = await gameContract.attackBoss();
                await attackTxn.wait();
                console.log('attackTxn:', attackTxn);          
              }
            } catch (error) {
              this.shouldListenForAttack = false;
              console.error('Error attacking boss:', error);
              this.hideSwal();
            }    
        },
        async fetchBoss(){
            const bossTxn = await gameContract.getBigBoss();
            console.log('Boss:', bossTxn);
            this.boss = transformBossData(bossTxn);
        },
        async getCharacters(){
            try {
              console.log('Getting contract characters to mint');
        
              const charactersTxn = await gameContract.getAll();
              console.log('charactersTxn:', charactersTxn);
        
              this.characters = charactersTxn.map((characterData) =>
                transformCharacterData(characterData)
              );        
            } catch (error) {
              console.error('Something went wrong fetching characters:', error);
            }
        },
        NftMinted(address, tokenId, characterId){
            if(this.shouldListenForMint){
                this.shouldListenForMint = false;
            }else{
                return;
            };
        
            this.hideSwal(); //I use SweetAlert2 for fancy pop-ups.. this just closes any open pop-up
            this.fetchNFTMeta();
            this.currentSection = 'arena';
        },
        async checkforWallet(){
            try{
                const { ethereum } = window;
        
                if(!ethereum){
                    console.log('Make sure you have metamask!');
                    return;
                }else{
                    console.log('We have the ethereum object!');
                    if(this.currentAccount != null) return;
        
                    const accounts = await ethereum.request({method: 'eth_accounts'});
        
                    if(accounts.length !== 0){
                        const account = accounts[0];
                        console.log('Found an account: ', account);
                        this.currentAccount = account;
                    }else{
                        console.log('No accounts found.');
                    }
                }      
            } catch (error){
                console.log(error);
            }
        },
        async fetchNFTMeta(){
            console.log('Checking for NFT at address:', this.currentAccount);
        
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            gameContract = new ethers.Contract(CONTRACT_ADDRESS,myEpicGame.abi,signer);
            this.CONTRACT_ADDRESS = CONTRACT_ADDRESS;
        
            // listen to emit events
            gameContract.removeAllListeners();
            gameContract.on('NftMinted', this.NftMinted);
            gameContract.on('AttackComplete', this.AttackComplete);
            gameContract.on('ResetHealth', this.onResetHealth);
        
            const txn = await gameContract.getUserNFT();
            console.log(txn);
        
            if(txn.name){
                console.log('User has an NFT');
                this.characterNFT = transformCharacterData(txn);
                this.currentSection = 'arena';
            }else{
                console.log('No NFT found');
            }
        },
        async mintCharacterNFTAction(characterId){
            try {
              if (gameContract) {
                this.shouldListenForMint = true;
                this.showSwal('Minting that badboy...');
                console.log(`Minting character ${characterId} in progress...`);
                const mintTxn = await gameContract.mintCharacterNFT(characterId);
                await mintTxn.wait();
                console.log('mintTxn:', mintTxn);
              }
            } catch (error) {
              this.shouldListenForMint = false;
              console.warn('MintCharacterAction Error:', error);
              this.hideSwal();
            }
        }
    }
  }
  
  Vue.createApp(App).mount('#app')