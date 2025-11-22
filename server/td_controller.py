from mcp.server.fastmcp import FastMCP
from pythonosc import udp_client

# 1. MCP 서버 생성 (이름은 마음대로 지어도 됩니다)
mcp = FastMCP("TouchDesigner Controller")

# 2. 터치디자이너로 신호를 쏠 준비
# 로컬호스트(127.0.0.1)의 10000번 포트로 쏩니다.
# (터치디자이너 OSC In CHOP의 포트번호와 같아야 함)
td_client = udp_client.SimpleUDPClient("127.0.0.1", 10000)

@mcp.tool()
def set_tuning_simulation(error_level: float, force_intensity: float) -> str:
    """
    핸드팬 튜닝 시뮬레이션의 파라미터를 조절합니다.
    
    Args:
        error_level: 튜닝 오차 정도 (0.0 ~ 1.0). 0이면 완벽, 1이면 엉망.
        force_intensity: 타격 강도 (0.0 ~ 5.0). 높을수록 세게 침.
    """
    
    # 터치디자이너로 OSC 메시지 전송
    # 주소: /simulation/error, 값: error_level
    td_client.send_message("/simulation/error", error_level)
    td_client.send_message("/simulation/force", force_intensity)
    
    return f"TouchDesigner 전송 완료: 오차={error_level}, 강도={force_intensity}"

@mcp.tool()
def reset_simulation() -> str:
    """시뮬레이션을 초기화합니다 (오차 0, 강도 0)."""
    td_client.send_message("/simulation/error", 0.0)
    td_client.send_message("/simulation/force", 0.0)
    return "시뮬레이션 리셋 완료."

# 서버 실행 (이 부분이 없으면 실행하자마자 꺼집니다!)
if __name__ == "__main__":
    mcp.run()