import { useRef, useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { initAudio, initMicAudio } from "utils/audioCtx";
import AudioFXPanel from "./AudioFXPanel";
import MidiFXPanel from "./MidiFXPanel";
import BodyTrackingPanel from "./BodyTrackingPanel";
import {
  initBodyTracking,
  machineConfig,
  setupCamera
} from "utils/bodytracking";
import { useRecoilValue, useSetRecoilState } from "recoil";
import keypoints from "atoms/keypoints";
import sessionConfig from "atoms/sessionConfig";
import midiSession from "atoms/midiSession";
import {
  drawKeypoints,
  drawSkeleton,
  getBodyParts,
  resetCanvas
} from "utils/utils";
import { isEmpty } from "lodash";
import { mapGlobalConfigsToSound } from "utils/audioUtils";
import { ChannelType, KeyedEffectType, MidiOutputType } from "utils/types";
import { initMidi, makeCCSender } from "utils/midiCtx";
import { mapGlobalConfigsToMidi } from "utils/midiUtils";
import BodyTrackingMidiPanel from "./BodyTrackingMidiPanel";
import { Dropdown, DropdownButton, Button } from "react-bootstrap";

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Buttons = styled.div`
  display: flex;
`;
const VideoCanvasContainer = styled.div`
  display: flex;
  justify-content: center;
  min-height: 500px;
`;

const Video = styled.video``;
const Canvas = styled.canvas``;

function VideoCanvas({
  canvasRef,
  videoRef
}: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
}) {
  const kpValues = useRecoilValue(keypoints);
  const video = videoRef.current;
  const canvas = canvasRef.current;
  const ctx: CanvasRenderingContext2D | null = canvas?.getContext("2d") || null;
  const config = machineConfig["fast"]; // TODO: This should come from the global state
  // console.log("kpValues", kpValues);
  useEffect(() => {
    if (ctx && video && !isEmpty(kpValues)) {
      resetCanvas(ctx, video);
      drawKeypoints(kpValues, config.confidence, ctx);
      drawSkeleton(kpValues, config.confidence, ctx);
    }
  }, [kpValues, ctx, video, config.confidence]);

  return (
    <VideoCanvasContainer>
      <Video ref={videoRef} />
      <Canvas ref={canvasRef} />
    </VideoCanvasContainer>
  );
}

function ConfigAudioBridge({
  audioCtx,
  audioFXs,
  videoHeight,
  videoWidth
}: {
  audioCtx: AudioContext;
  audioFXs: KeyedEffectType;
  videoHeight: number;
  videoWidth: number;
}) {
  const kpValues = useRecoilValue(keypoints);
  const sessionCfg = useRecoilValue(sessionConfig);
  const config = machineConfig[sessionCfg.machineType]; // TODO: This should come from the global state

  useEffect(() => {
    if (!isEmpty(kpValues)) {
      const bodyPartPositions = getBodyParts(
        kpValues,
        config.confidence,
        videoHeight,
        videoWidth
      );

      //TODO: pass only skip size from config and deal with FX with ref
      mapGlobalConfigsToSound(
        sessionCfg,
        bodyPartPositions,
        audioCtx,
        audioFXs
      );
    }
  }, [kpValues, sessionCfg, audioCtx, audioFXs, config.confidence, videoHeight, videoWidth]);

  return <div></div>;
}

function ConfigMidiBridge({
  ccSender,
  videoHeight,
  videoWidth,
} : {
  ccSender: (channel: ChannelType, controller: number, velocity: number) => void;
  videoHeight: number;
  videoWidth: number;
}) {
  const kpValues = useRecoilValue(keypoints);
  const midiSessionConfig = useRecoilValue(midiSession);
  const config = machineConfig[midiSessionConfig.machineType];

  useEffect(() => {
    if (!isEmpty(kpValues)) {
      const bodyPartPositions = getBodyParts(
        kpValues,
        config.confidence,
        videoHeight,
        videoWidth
      );

      mapGlobalConfigsToMidi(
        midiSessionConfig,
        bodyPartPositions,
        ccSender,
      );
    }
  }, [kpValues, midiSessionConfig, config.confidence, videoHeight, videoWidth, ccSender]);

  return <div></div>;
}

function MidiDropdown({options, onSelect}:{options: MidiOutputType[], onSelect: (output: keyof MidiOutputType | undefined) => void}) {
//   return (
//     <select name="pets" id="" onChange={(e) => onSelect(e.target.value as keyof MidiOutputType)}>
//     <option value="">--Please choose a midi output--</option>
//     {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
// </select>
//   )

  return (
    <DropdownButton title='Select Midi Output' onSelect={(e) => onSelect(e as keyof MidiOutputType)}>
    {options.map(o => <Dropdown.Item key={o.id} eventKey={o.id}>{o.name}</Dropdown.Item>)}
  </DropdownButton>
  )
}

function SomaUI() {
  const setKeypoints = useSetRecoilState(keypoints);
  const sessionCfg = useRecoilValue(sessionConfig);

  const audioFXs = useRef<KeyedEffectType>({}); // keyed store of audio nodes
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [audioCtx, setAudioCtx] = useState<AudioContext | undefined>(undefined);
  const [mode, setMode] = useState<'audio' | 'midi' | undefined>(undefined);
  const [midiOutputs, setMidiOutputs] = useState<MidiOutputType[] | undefined>(undefined);
  const [selecectedOutputId, setSelectedOutputId] = useState<keyof MidiOutputType | undefined>(undefined);

  const initAudioSource = async (source: "audio" | "mic") => {
    const audioCtx =
      source === "audio"
        ? await initAudio(sessionCfg, audioFXs.current)
        : await initMicAudio(sessionCfg, audioFXs.current);

    setAudioCtx(audioCtx);
  };

  const initTracking = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      await setupCamera(video);

      video.play();
      video.hidden = true;

      // NOTE: Set video and Canvas size from ratio of video src
      const ratio = video.videoWidth / video.videoHeight;
      const width = 720;
      const height = Math.floor(width / ratio);

      video.setAttribute("height", String(height));
      video.setAttribute("width", String(width));

      canvas.width = width;
      canvas.height = height;

      initBodyTracking("fast", video, setKeypoints, ratio);
    }
  };

  const initAll = async (source: "audio" | "mic") => {
    await initTracking();
    await initAudioSource(source);
    setMode("audio");
  };

  const initMidiSession = async () => {
    await initTracking();
    const midiOut = await initMidi();
    setMidiOutputs(midiOut);
    setMode('midi');
  }

  const ccSender = useMemo(() => {
    const selectedOutput = selecectedOutputId ? midiOutputs?.find(o => o.id === selecectedOutputId) : undefined
    if (selectedOutput) {
      return makeCCSender(selectedOutput)
    }

    return undefined
  }, [midiOutputs, selecectedOutputId])

  return (
        <Container>
        <Buttons>
        {!mode && <>
            <Button onClick={() => initAll("audio")}>Start audio</Button>
            <Button onClick={() => initAll("mic")}>Start mic</Button>
            <Button onClick={() => initMidiSession()}>Start midi</Button>
            </>}
        {mode === 'midi' && midiOutputs && <MidiDropdown options={midiOutputs} onSelect={setSelectedOutputId} />}
        </Buttons>
        <VideoCanvas canvasRef={canvasRef} videoRef={videoRef} />
        {mode === "audio" && <AudioFXPanel audioFXs={audioFXs.current} />}
        {audioCtx && mode === "audio" && (
            <ConfigAudioBridge
            audioCtx={audioCtx}
            audioFXs={audioFXs.current}
            videoHeight={videoRef.current?.height || 0}
            videoWidth={videoRef.current?.width || 0}
            />
            )}
        {mode === "midi" && ccSender && <ConfigMidiBridge
        ccSender={ccSender}
        videoHeight={videoRef.current?.height || 0}
        videoWidth={videoRef.current?.width || 0}
        />}
        {mode === "midi" && <MidiFXPanel />}
        {mode === "audio" && <BodyTrackingPanel />}
        {mode === 'midi' && <BodyTrackingMidiPanel /> }
        </Container>
  );
}

export default SomaUI;
