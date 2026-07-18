# Grokking Deep Learning

重みを見るだけで、入力がどのように扱われるかをざっくり確認することができる。

重みと入力は線形和となるため、

![](/Users/ken702/Library/Application%20Support/marktext/images/2026-07-16-14-52-02-image.png)

この例のようにinput[0]とinput[2]の和 (OR) で、input[2]については負の数(NOT)がつき、その論理演算の結果のように解釈することができるし、もちろん結果が0/1じゃなくても、どの入力がどのような扱いがされるかは見て取れる

![](/Users/ken702/Library/Application%20Support/marktext/images/2026-07-16-14-53-27-image.png)

この例では、input[0]は採用自体はされるが、値が大きいので他の値を埋もれさせないように1未満の重みがかけられる。つまり、大きい値だということが想像がつく
