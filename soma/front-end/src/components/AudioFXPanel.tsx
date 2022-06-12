import styled from "styled-components";
import audioEffects from "atoms/audioEffects";
import { useRecoilValue, useRecoilState } from "recoil";
import selectedEffect from "atoms/selectedAudioEffect";
import { KeyedEffectType } from "utils/types";
import { CloseX, Container, EffectBox, EffectConnect, EffectContainer } from "./shared";

const Cable = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  width: 40px;
`;

function AudioFXPanel({ audioFXs }: { audioFXs: KeyedEffectType }) {
  const fx = useRecoilValue(audioEffects);
  const [selected, setSelected] = useRecoilState(selectedEffect);

  const handleDisconnect = () => {
    // Get AudioFx node with selected key, previous and next
    // Trigger disconnect
    // Update state
  };

  return (
    <Container>
      <EffectContainer selectable={false}>
        <EffectBox>Source</EffectBox>
      </EffectContainer>
      <Cable>{`==>`}</Cable>
      {fx.map((eff) => (
        <EffectConnect key={eff.key}>
          <EffectContainer
            selectable
            selected={
              eff.key === selected.key && eff.bodyPart === selected.bodyPart
            }
          >
            <CloseX onClick={handleDisconnect}>X</CloseX>
            <EffectBox
              onClick={() =>
                setSelected({ key: eff.key, bodyPart: eff.bodyPart })
              }
              key={`${eff.key}-${eff.bodyPart}`}
              selectable
            >
              {eff.key}-{eff.bodyPart}
            </EffectBox>
          </EffectContainer>
          <Cable>{`==>`}</Cable>
        </EffectConnect>
      ))}
      <EffectContainer selectable={false}>
        <EffectBox>Master</EffectBox>
      </EffectContainer>
    </Container>
  );
}

export default AudioFXPanel;
