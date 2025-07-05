import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, TextInput, ScrollView } from 'react-native';
import NfcManager, { NfcTech, MifareClassic, NdefMessage } from 'react-native-nfc-manager';
import { Buffer } from 'buffer';

const AddCardScreen = () => {
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [customKey, setCustomKey] = useState('');
  const [customAid, setCustomAid] = useState('');
  const [status, setStatus] = useState('Idle');
  const [cardInfo, setCardInfo] = useState({});

  useEffect(() => {
    const initNfc = async () => {
      try {
        await NfcManager.start();
        const supported = await NfcManager.isSupported();
        setIsNfcSupported(supported);
        if (!supported) {
          Alert.alert('Error', 'NFC is not supported on this device.');
        }
      } catch (ex) {
        Alert.alert('Error', 'Failed to initialize NFC: ' + ex.message);
      }
    };
    initNfc();
    return () => NfcManager.stop();
  }, []);

  const detectCard = async () => {
    try {
      const techs = [
        NfcTech.MifareClassic,
        NfcTech.MifareUltralight,
        NfcTech.NfcA,
        NfcTech.IsoDep,
        NfcTech.NdefFormatable,
      ];
      await NfcManager.requestTechnology(techs);
      const tag = await NfcManager.getTag();

      let isoDepInfo = {};
      if (tag.techTypes.includes('android.nfc.tech.IsoDep')) {
        try {
          await NfcManager.setTechnology(NfcTech.IsoDep);
          const ncmcAid = [0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x03, 0x97, 0x00, 0x00];
          const isoDep = await NfcManager.isoDepTransceive(ncmcAid);
          isoDepInfo = {
            historicalBytes: tag.historicalBytes
              ? Buffer.from(tag.historicalBytes).toString('hex')
              : 'N/A',
            ncmcSelectResponse: Buffer.from(isoDep).toString('hex'),
          };
        } catch (ex) {
          isoDepInfo = { error: `IsoDep probe failed: ${ex.message}` };
        }
      }

      let ndefInfo = {};
      if (tag.techTypes.includes('android.nfc.tech.NdefFormatable')) {
        try {
          await NfcManager.setTechnology(NfcTech.NdefFormatable);
          const ndef = await NfcManager.getNdefMessage();
          ndefInfo = {
            ndefMessage: ndef ? NdefMessage.toString(ndef) : 'No NDEF data',
          };
        } catch (ex) {
          ndefInfo = { error: `NDEF probe failed: ${ex.message}` };
        }
      }

      setCardInfo({
        id: tag.id,
        techTypes: tag.techTypes,
        type: tag.type || 'Unknown',
        maxSize: tag.maxSize || 'Unknown',
        isWritable: tag.isWritable || false,
        atqa: tag.atqa ? Buffer.from(tag.atqa).toString('hex') : 'N/A',
        sak: tag.sak ? tag.sak.toString(16) : 'N/A',
        historicalBytes: tag.historicalBytes
          ? Buffer.from(tag.historicalBytes).toString('hex')
          : 'N/A',
        isoDepInfo,
        ndefInfo,
      });

      setStatus(`Card detected: ${tag.id || 'Unknown ID'}`);

      if (tag.techTypes.includes('android.nfc.tech.MifareClassic')) {
        setStatus('MIFARE Classic card confirmed');
        return { tech: NfcTech.MifareClassic, tag };
      } else if (tag.techTypes.includes('android.nfc.tech.MifareUltralight')) {
        setStatus('MIFARE Ultralight card detected');
        return { tech: NfcTech.MifareUltralight, tag };
      } else if (tag.techTypes.includes('android.nfc.tech.IsoDep')) {
        setStatus('IsoDep (likely DESFire/NCMC) card detected');
        return { tech: NfcTech.IsoDep, tag };
      } else if (tag.techTypes.includes('android.nfc.tech.NfcA')) {
        setStatus('NfcA card detected');
        return { tech: NfcTech.NfcA, tag };
      } else {
        setStatus(`Unsupported card type: ${tag.techTypes.join(', ')}`);
        return null;
      }
    } catch (ex) {
      setStatus(`Error detecting card: ${ex.message}`);
      setCardInfo({ error: ex.message });
      return null;
    }
  };

  const readCard = async () => {
    setStatus('Reading card...');
    try {
      const card = await detectCard();
      if (!card) return;

      const { tech, tag } = card;
      let cardDump = [];

      if (tech === NfcTech.MifareClassic) {
        const defaultKeys = [
          Buffer.from('FFFFFFFFFFFF', 'hex'),
          Buffer.from('D3F7D3F7D3F7', 'hex'),
        ];
        const key = customKey && customKey.length === 12 ? Buffer.from(customKey, 'hex') : defaultKeys[0];

        const sectorCount = MifareClassic.SECTOR_COUNT;
        for (let sector = 0; sector < sectorCount; sector++) {
          let authSuccess = false;
          for (const k of [key, ...defaultKeys]) {
            try {
              await NfcManager.mifareClassicAuthenticateA(sector, k);
              authSuccess = true;
              break;
            } catch (ex) {
              try {
                await NfcManager.mifareClassicAuthenticateB(sector, k);
                authSuccess = true;
                break;
              } catch (e) {
                continue;
              }
            }
          }

          if (!authSuccess) {
            setStatus(`Failed to authenticate sector ${sector}`);
            continue;
          }

          const blockCount = await NfcManager.mifareClassicGetBlockCountInSector(sector);
          const sectorData = [];
          for (let block = 0; block < blockCount; block++) {
            const blockIndex = await NfcManager.mifareClassicSectorToBlock(sector) + block;
            const data = await NfcManager.mifareClassicReadBlock(blockIndex);
            sectorData.push(Buffer.from(data).toString('hex'));
          }
          cardDump.push({ sector, blocks: sectorData });
        }
      } else if (tech === NfcTech.MifareUltralight) {
        const pageCount = 64;
        for (let page = 0; page < pageCount; page += 4) {
          try {
            const data = await NfcManager.mifareUltralightReadPages(page);
            cardDump.push({
              page,
              data: Buffer.from(data).toString('hex'),
            });
          } catch (ex) {
            setStatus(`Failed to read page ${page}: ${ex.message}`);
            continue;
          }
        }
      } else if (tech === NfcTech.IsoDep) {
        await NfcManager.setTechnology(NfcTech.IsoDep);
        const probes = [];

        try {
          const getVersion = await NfcManager.isoDepTransceive([0x90, 0x60, 0x00, 0x00, 0x00]);
          probes.push({
            command: 'GET_VERSION',
            response: Buffer.from(getVersion).toString('hex'),
          });
        } catch (ex) {
          probes.push({ command: 'GET_VERSION', error: ex.message });
        }

        try {
          const selectNcmc = await NfcManager.isoDepTransceive([
            0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x03, 0x97, 0x00, 0x00,
          ]);
          probes.push({
            command: 'SELECT_NCMC_AID_A000000397',
            response: Buffer.from(selectNcmc).toString('hex'),
          });
        } catch (ex) {
          probes.push({ command: 'SELECT_NCMC_AID_A000000397', error: ex.message });
        }

        try {
          const selectNdef = await NfcManager.isoDepTransceive([
            0x00, 0xa4, 0x04, 0x00, 0x07, 0xd2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01,
          ]);
          probes.push({
            command: 'SELECT_NDEF_AID_D2760000850101',
            response: Buffer.from(selectNdef).toString('hex'),
          });
        } catch (ex) {
          probes.push({ command: 'SELECT_NDEF_AID_D2760000850101', error: ex.message });
        }

        if (customAid && customAid.length >= 14) {
          try {
            const aid = Buffer.from(customAid, 'hex');
            const selectCustom = await NfcManager.isoDepTransceive([
              0x00, 0xa4, 0x04, 0x00, aid.length, ...aid,
            ]);
            probes.push({
              command: `SELECT_CUSTOM_AID_${customAid}`,
              response: Buffer.from(selectCustom).toString('hex'),
            });
          } catch (ex) {
            probes.push({ command: `SELECT_CUSTOM_AID_${customAid}`, error: ex.message });
          }
        }

        try {
          const getAppIds = await NfcManager.isoDepTransceive([0x90, 0x6a, 0x00, 0x00, 0x00]);
          probes.push({
            command: 'GET_APPLICATION_IDS',
            response: Buffer.from(getAppIds).toString('hex'),
          });
        } catch (ex) {
          probes.push({ command: 'GET_APPLICATION_IDS', error: ex.message });
        }

        cardDump = probes;
        setCardInfo((prev) => ({ ...prev, isoDepProbes: probes }));
      } else

 if (tech === NfcTech.NfcA) {
        try {
          await NfcManager.setTechnology(NfcTech.NfcA);
          const atqa = tag.atqa ? Buffer.from(tag.atqa).toString('hex') : 'N/A';
          const sak = tag.sak ? tag.sak.toString(16) : 'N/A';
          cardDump.push({ type: 'NfcA', atqa, sak, uid: tag.id });
          setStatus('NfcA data limited; try IsoDep for DMRC card reading');
        } catch (ex) {
          setStatus(`NfcA read failed: ${ex.message}`);
        }
      } else {
        setStatus(`Reading not supported for ${tech}`);
        return;
      }

      setCardData(cardDump);
      setStatus('Card read successfully');
      saveCardDump(cardDump, tech);
    } catch (ex) {
      setStatus(`Error reading card: ${ex.message}`);
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  };

  const saveCardDump = (dump, tech) => {
    try {
      const fs = require('react-native-fs');
      const path = fs.DocumentDirectoryPath + `/dmrc_card_dump_${tech}_${Date.now()}.json`;
      const data = JSON.stringify({ tech, dump, cardType: 'DMRC Metro Card' }, null, 2);
      fs.writeFile(path, data, 'utf8');
      setStatus(`Card dump saved to ${path}`);
    } catch (ex) {
      setStatus(`Error saving dump: ${ex.message}`);
    }
  };

  const writeCard = async () => {
    setStatus('Writing to card...');
    try {
      if (!cardData) {
        setStatus('No card data to write');
        return;
      }
      const card = await detectCard();
      if (!card) return;

      const { tech } = card;
      if (tech === NfcTech.MifareClassic) {
        const defaultKeys = [
          Buffer.from('FFFFFFFFFFFF', 'hex'),
          Buffer.from('D3F7D3F7D3F7', 'hex'),
        ];
        const key = customKey && customKey.length === 12 ? Buffer.from(customKey, 'hex') : defaultKeys[0];

        for (const sectorData of cardData) {
          const { sector, blocks } = sectorData;
          let authSuccess = false;
          for (const k of [key, ...defaultKeys]) {
            try {
              await NfcManager.mifareClassicAuthenticateA(sector, k);
              authSuccess = true;
              break;
            } catch (ex) {
              try {
                await NfcManager.mifareClassicAuthenticateB(sector, k);
                authSuccess = true;
                break;
              } catch (e) {
                continue;
              }
            }
          }

          if (!authSuccess) {
            setStatus(`Failed to authenticate sector ${sector} for writing`);
            continue;
          }

          const blockBase = await NfcManager.mifareClassicSectorToBlock(sector);
          for (let i = 0; i < blocks.length; i++) {
            if (i === blocks.length - 1) continue;
            const blockIndex = blockBase + i;
            const data = Buffer.from(blocks[i], 'hex');
            await NfcManager.mifareClassicWriteBlock(blockIndex, data);
          }
        }
      } else if (tech === NfcTech.MifareUltralight) {
        for (const pageData of cardData) {
          const { page, data } = pageData;
          try {
            const bytes = Buffer.from(data, 'hex');
            await NfcManager.mifareUltralightWritePage(page, bytes);
          } catch (ex) {
            setStatus(`Failed to write page ${page}: ${ex.message}`);
            continue;
          }
        }
      } else if (tech === NfcTech.IsoDep) {
        setStatus('DMRC DESFire writing requires specific AID and AES keys; contact DMRC for details');
      } else {
        setStatus(`Writing not supported for ${tech}`);
        return;
      }

      setStatus('Card written successfully');
    } catch (ex) {
      setStatus(`Error writing card: ${ex.message}`);
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <ScrollView style={{ width: '100%' }}>
        <Text style={{ marginBottom: 10 }}>Status: {status}</Text>
        <Text style={{ marginBottom: 10 }}>
          Card Info: {JSON.stringify(cardInfo, null, 2)}
        </Text>
        <TextInput
          placeholder="Enter custom key (hex, e.g., 16 bytes for AES)"
          value={customKey}
          onChangeText={setCustomKey}
          style={{ borderWidth: 1, width: '100%', geo_marginBottom: 10, padding: 5 }}
        />
        <TextInput
          placeholder="Enter custom AID (hex, e.g., A000000397)"
          value={customAid}
          onChangeText={setCustomAid}
          style={{ borderWidth: 1, width: '100%', marginBottom: 10, padding: 5 }}
        />
      </ScrollView>
      <Button title="Read Card" onPress={readCard} />
      <Button title="Write Card" onPress={writeCard} />
    </View>
  );
};

export default AddCardScreen;