import psutil
import os

def kill_port_8000():
    for conn in psutil.net_connections(kind='inet'):
        if conn.laddr.port == 8000:
            pid = conn.pid
            if pid:
                print(f"Found process {pid} listening on port 8000.")
                try:
                    proc = psutil.Process(pid)
                    proc.terminate()
                    proc.wait(timeout=3)
                    print(f"Process {pid} terminated.")
                except psutil.TimeoutExpired:
                    proc.kill()
                    print(f"Process {pid} forcefully killed.")
                except Exception as e:
                    print(f"Failed to kill process {pid}: {e}")
            else:
                print("Found port 8000 in use but no PID associated (access denied or system process).")

if __name__ == "__main__":
    kill_port_8000()
